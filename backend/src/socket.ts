import { Server as HttpServer } from 'http';
import { Server, Socket, Namespace } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from './config/logger';
import User from './models/User';
import { isOriginAllowed } from './config/corsConfig';
import { STAFF_ROLES } from './config/adminConfig';
import { setSocketAdapterMode } from './config/socketState';
import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient } from './utils/cache/redis';
import { checkSocketConnectionRateLimit } from './utils/socketConnectionRateLimit';

/**
 * Socket.io Server Configuration
 *
 * Defines the real-time communication layer with two isolated namespaces:
 * - /admin: High-priority alerts and dashboard updates (enforces single active session per user)
 * - /user: Customer-specific order tracking and notifications
 * - /visitor: Public namespace for live traffic analytics (unauthenticated)
 *
 * Uses Redis Adapter when REQUIRE_REDIS=true or multi-instance is detected to
 * prevent split-brain delivery across nodes. Falls back to in-memory for local dev.
 */
let io: Server;

type SocketUser = { _id: { toString(): string }; role: string; email: string };

const socketLogContext = (socket: Socket, namespace: '/admin' | '/user', user: SocketUser) => ({
  correlationId: socket.id,
  socketId: socket.id,
  namespace,
  userId: user._id.toString(),
  email: user.email,
});

const resolveMultiInstance = (): boolean => {
  const explicit = process.env.RENDER_INSTANCE_COUNT || process.env.WEB_CONCURRENCY;
  if (explicit) {
    return Number(explicit) > 1;
  }
  return false;
};

const assertRedisForSocket = (hasRedisAdapter: boolean): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  const requireRedis = process.env.REQUIRE_REDIS === 'true';
  const multiInstance = resolveMultiInstance();

  if (hasRedisAdapter) return;

  if (requireRedis || (isProduction && multiInstance)) {
    logger.error(
      '[SOCKET CRITICAL] Redis adapter is required when REQUIRE_REDIS=true or when running multiple instances. ' +
        'Aborting startup to prevent split-brain real-time delivery.',
    );
    process.exit(1);
  }

  const isConfigured = !!process.env.REDIS_URL?.trim();

  if (isProduction) {
    logger.warn(
      `[SOCKET] ${isConfigured ? 'Redis connection unavailable' : 'REDIS_URL not set'} — using in-memory Socket.io adapter. ` +
        'Real-time alerts only reach clients on the same instance.',
    );
  } else {
    logger.warn(
      `[SOCKET] ${isConfigured ? 'Redis unavailable' : 'REDIS_URL not set'} — using in-memory adapter (OK for local single-instance dev).`,
    );
  }
};

const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token =
      socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const jwtSecrets = (process.env.JWT_SECRET || '').split(',').map((s) => s.trim());
    if (!jwtSecrets.length || !jwtSecrets[0]) {
      return next(new Error('Authentication error: Server misconfigured'));
    }

    let decoded: { id?: string; iat?: number } | undefined;
    let lastError: Error | undefined;

    for (const secret of jwtSecrets) {
      try {
        decoded = jwt.verify(token, secret) as { id?: string; iat?: number };
        break; // Stop on first successful verification
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!decoded?.id) {
      return next(lastError || new Error('Authentication error: Invalid token'));
    }

    const user = await User.findById(decoded.id)
      .select('role email isVerified passwordChangedAt')
      .lean();
    if (!user || !user.isVerified) {
      return next(new Error('Authentication error: Invalid user'));
    }

    if (
      user.passwordChangedAt &&
      decoded.iat != null &&
      decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      return next(new Error('Authentication error: Session invalidated'));
    }

    (socket as Socket & { user: SocketUser }).user = user as SocketUser;
    next();
  } catch (err) {
    logger.error('Socket Authentication failed:', err);
    next(new Error('Authentication error'));
  }
};

/** Single active /admin socket per user — disconnects older sessions (works with Redis adapter). */
const enforceSingleAdminSession = async (
  namespace: Namespace,
  userId: string,
  currentSocketId: string,
): Promise<void> => {
  const sockets = await namespace.fetchSockets();
  for (const remote of sockets) {
    if (remote.id === currentSocketId) continue;
    const remoteUser = (remote as unknown as { user?: SocketUser }).user;
    if (remoteUser?._id?.toString() === userId) {
      logger.info('[Socket /admin] Replacing prior session', {
        correlationId: currentSocketId,
        priorSocketId: remote.id,
        userId,
      });
      remote.disconnect(true);
    }
  }
};

const registerNamespace = (namespace: Namespace, options: { adminOnly?: boolean }) => {
  namespace.use(socketAuthMiddleware);

  if (options.adminOnly) {
    namespace.use((socket: Socket, next) => {
      const user = (socket as Socket & { user: SocketUser }).user;
      if (!STAFF_ROLES.includes(user.role as (typeof STAFF_ROLES)[number])) {
        return next(new Error('Authentication error: Admin access required'));
      }
      next();
    });
  }

  namespace.on('connection', async (socket: Socket) => {
    const user = (socket as Socket & { user: SocketUser }).user;

    const ns = options.adminOnly ? '/admin' : '/user';

    if (options.adminOnly) {
      await enforceSingleAdminSession(namespace, user._id.toString(), socket.id);
      logger.info('[Socket /admin] Connected', socketLogContext(socket, ns, user));
      socket.join('admin-alerts');
      logger.info('[Socket /admin] Room join', {
        ...socketLogContext(socket, ns, user),
        room: 'admin-alerts',
      });
    } else {
      logger.info('[Socket /user] Connected', socketLogContext(socket, ns, user));
      const room = `user-${user._id}`;
      socket.join(room);
      logger.info('[Socket /user] Room join', { ...socketLogContext(socket, ns, user), room });
    }

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket ${ns}] Disconnected`, {
        ...socketLogContext(socket, ns, user),
        reason,
      });
    });
  });
};

// In-memory active visitor registry for throttling heartbeats
const activeVisitors = new Map<string, any>();

let broadcastInterval: NodeJS.Timeout;

export const startBroadcastInterval = () => {
  if (broadcastInterval) clearInterval(broadcastInterval);
  broadcastInterval = setInterval(() => {
    if (!io) return;
    const ioServer = io;
    if (!ioServer) return;

    const adminSockets = ioServer.of('/admin').sockets.size;
    if (adminSockets === 0) return; // No admins connected, skip broadcast

    const now = Date.now();
    const visitorsArray = [];

    // Clean stale and build broadcast payload
    for (const [socketId, data] of activeVisitors.entries()) {
      if (now - data.lastSeen > 60000) {
        activeVisitors.delete(socketId);
      } else {
        visitorsArray.push(data);
      }
    }

    // Push aggregated state to admins. Cap the per-tick payload: admins only need
    // the live count plus a bounded sample of visitors, not an unbounded array that
    // grows with traffic and is re-broadcast every 5s to every admin socket.
    if (visitorsArray.length > 0) {
      const MAX_VISITORS_IN_PAYLOAD = 100;
      ioServer
        .of('/admin')
        .to('admin-alerts')
        .emit('live:visitor_sync', {
          activeCount: visitorsArray.length,
          visitors: visitorsArray.slice(0, MAX_VISITORS_IN_PAYLOAD),
          timestamp: now,
        });
    }
  }, 5000);
};

export const clearBroadcastInterval = () => {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
  }
};

const registerVisitorNamespace = (namespace: Namespace) => {
  // Unauthenticated namespace for live traffic analytics
  namespace.on('connection', (socket: Socket) => {
    logger.debug('[Socket /visitor] Connected', { socketId: socket.id });

    socket.on('visitor:heartbeat', (data) => {
      // Buffer the live heartbeat
      activeVisitors.set(socket.id, {
        ...data,
        socketId: socket.id,
        lastSeen: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      activeVisitors.delete(socket.id);
      logger.debug('[Socket /visitor] Disconnected', { socketId: socket.id });
    });
  });
};

export const initSocket = (server: HttpServer) => {
  const hasRedisAdapter = !!(pubClient && subClient);
  assertRedisForSocket(hasRedisAdapter);
  setSocketAdapterMode(hasRedisAdapter ? 'redis' : 'memory');

  io = new Server(server, {
    perMessageDeflate: { threshold: 1024 },
    cors: {
      origin: (origin, callback) => {
        if (!origin || isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Not allowed by CORS: Origin "${origin}" is not allowed`));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 15000,
    maxHttpBufferSize: 1e6,
    connectionStateRecovery: {
      maxDisconnectionDuration: process.env.NODE_ENV === 'production' ? 30 * 1000 : 2 * 60 * 1000,
    },
    adapter: hasRedisAdapter ? createAdapter(pubClient!, subClient!) : undefined,
  });

  io.use(async (socket, next) => {
    const { allowed, ip } = await checkSocketConnectionRateLimit(socket);
    if (!allowed) {
      logger.warn('[SOCKET] Connection rate limit exceeded', {
        correlationId: socket.id,
        ip,
      });
      return next(new Error('Too many connection attempts'));
    }
    next();
  });

  // Default namespace is not used — reject stray connections immediately
  io.on('connection', (socket) => {
    logger.warn('[SOCKET] Rejected connection on default namespace', { socketId: socket.id });
    socket.disconnect(true);
  });

  registerNamespace(io.of('/admin'), { adminOnly: true });
  registerNamespace(io.of('/user'), { adminOnly: false });
  registerVisitorNamespace(io.of('/visitor'));

  startBroadcastInterval();

  logger.info(
    `[SOCKET] Namespaces ready (/admin, /user, /visitor) — adapter: ${hasRedisAdapter ? 'redis' : 'memory'}`,
  );
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

export const getSocketCounts = () => {
  if (!io) return { total: 0, admin: 0, user: 0 };
  return {
    total: io.engine.clientsCount,
    admin: io.of('/admin').sockets.size,
    user: io.of('/user').sockets.size,
  };
};

export const emitAdminNotification = (payload: unknown) => {
  if (!io) {
    logger.warn('Tried to emit admin notification but Socket.io is not initialized');
    return;
  }
  io.of('/admin').to('admin-alerts').emit('new_notification', payload);
};

export const emitAdminEvent = (event: string, payload: unknown) => {
  if (!io) {
    logger.debug(`[Socket /admin] Skipped emit "${event}" — Socket.io not initialized`);
    return;
  }
  io.of('/admin').to('admin-alerts').emit(event, payload);
};

/** Push order/booking updates to a specific customer socket room. */
export const emitUserEvent = (userId: string, event: string, payload: unknown) => {
  if (!io) {
    logger.debug(`[Socket /user] Skipped emit "${event}" — Socket.io not initialized`);
    return;
  }
  io.of('/user').to(`user-${userId}`).emit(event, payload);
};

export const emitGlobalUserEvent = (event: string, payload: unknown) => {
  if (!io) return;
  io.of('/user').emit(event, payload);
};
