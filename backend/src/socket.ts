import { Server as HttpServer } from 'http';
import { Server, Socket, Namespace } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from './config/logger';
import User from './models/User';
import { isOriginAllowed } from './config/corsConfig';
import { ADMIN_ROLES } from './config/adminConfig';
import { setSocketAdapterMode } from './config/socketState';
import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient } from './utils/redis';
import { checkSocketConnectionRateLimit } from './utils/socketConnectionRateLimit';

let io: Server;

type SocketUser = { _id: { toString(): string }; role: string; email: string };

const socketLogContext = (
  socket: Socket,
  namespace: '/admin' | '/user',
  user: SocketUser
) => ({
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
        'Aborting startup to prevent split-brain real-time delivery.'
    );
    process.exit(1);
  }

  const isConfigured = !!process.env.REDIS_URL?.trim();

  if (isProduction) {
    logger.warn(
      `[SOCKET] ${isConfigured ? 'Redis connection unavailable' : 'REDIS_URL not set'} — using in-memory Socket.io adapter. ` +
        'Real-time alerts only reach clients on the same instance.'
    );
  } else {
    logger.warn(`[SOCKET] ${isConfigured ? 'Redis unavailable' : 'REDIS_URL not set'} — using in-memory adapter (OK for local single-instance dev).`);
  }
};

const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new Error('Authentication error: Server misconfigured'));
    }

    const decoded = jwt.verify(token, secret) as { id?: string; iat?: number };
    if (!decoded?.id) {
      return next(new Error('Authentication error: Invalid token'));
    }

    const user = await User.findById(decoded.id).select('role email isVerified passwordChangedAt');
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
  currentSocketId: string
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
      if (!ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number])) {
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
      logger.info('[Socket /admin] Room join', { ...socketLogContext(socket, ns, user), room: 'admin-alerts' });
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

export const initSocket = (server: HttpServer) => {
  const hasRedisAdapter = !!(pubClient && subClient);
  assertRedisForSocket(hasRedisAdapter);
  setSocketAdapterMode(hasRedisAdapter ? 'redis' : 'memory');

  io = new Server(server, {
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
      maxDisconnectionDuration: 2 * 60 * 1000,
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

  // JWT required on all namespace connections (handshake auth.token or Authorization header)
  io.use(socketAuthMiddleware);

  // Default namespace is not used — reject stray unauthenticated connections
  io.on('connection', (socket) => {
    logger.warn('[SOCKET] Rejected connection on default namespace', { socketId: socket.id });
    socket.disconnect(true);
  });

  registerNamespace(io.of('/admin'), { adminOnly: true });
  registerNamespace(io.of('/user'), { adminOnly: false });

  logger.info(
    `[SOCKET] Namespaces ready (/admin, /user) — adapter: ${hasRedisAdapter ? 'redis' : 'memory'}`
  );
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

export const emitAdminNotification = (payload: unknown) => {
  if (!io) {
    logger.warn('Tried to emit admin notification but Socket.io is not initialized');
    return;
  }
  io.of('/admin').to('admin-alerts').emit('new_notification', payload);
};

/** Push order/booking updates to a specific customer socket room. */
export const emitUserEvent = (userId: string, event: string, payload: unknown) => {
  if (!io) {
    logger.debug(`[Socket /user] Skipped emit "${event}" — Socket.io not initialized`);
    return;
  }
  io.of('/user').to(`user-${userId}`).emit(event, payload);
};
