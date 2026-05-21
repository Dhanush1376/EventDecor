import { Server as HttpServer } from 'http';
import { Server, Socket, Namespace } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from './config/logger';
import User from './models/User';
import { isOriginAllowed } from './app';
import { ADMIN_ROLES } from './config/adminConfig';
import { setSocketAdapterMode } from './config/socketState';
import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient } from './utils/redis';
import { checkSocketConnectionRateLimit } from './utils/socketConnectionRateLimit';

let io: Server;

type SocketUser = { _id: { toString(): string }; role: string; email: string };

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
      '[SOCKET CRITICAL] REDIS_URL is required for Socket.io when REQUIRE_REDIS=true or when running multiple instances. ' +
        'Aborting startup to prevent split-brain real-time delivery.'
    );
    process.exit(1);
  }

  if (isProduction) {
    logger.warn(
      '[SOCKET] REDIS_URL not set — using in-memory Socket.io adapter. ' +
        'Real-time alerts only reach clients on the same instance. Set REDIS_URL before horizontal scaling.'
    );
  } else {
    logger.warn('[SOCKET] REDIS_URL not set — in-memory adapter (OK for local single-instance dev).');
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id?: string };
    if (!decoded?.id) {
      return next(new Error('Authentication error: Invalid token'));
    }

    const user = await User.findById(decoded.id).select('role email isVerified');
    if (!user || !user.isVerified) {
      return next(new Error('Authentication error: Invalid user'));
    }

    (socket as Socket & { user: SocketUser }).user = user as SocketUser;
    next();
  } catch (err) {
    logger.error('Socket Authentication failed:', err);
    next(new Error('Authentication error'));
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

  namespace.on('connection', (socket: Socket) => {
    const user = (socket as Socket & { user: SocketUser }).user;

    if (options.adminOnly) {
      logger.info(`[Socket /admin] Connected: ${user.email} (${socket.id})`);
      socket.join('admin-alerts');
    } else {
      logger.info(`[Socket /user] Connected: ${user.email} (${socket.id})`);
      socket.join(`user-${user._id}`);
    }

    socket.on('disconnect', () => {
      const ns = options.adminOnly ? '/admin' : '/user';
      logger.debug(`[Socket ${ns}] Disconnected: ${user.email} (${socket.id})`);
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
      logger.warn(`[SOCKET] Connection rate limit exceeded for IP: ${ip}`);
      return next(new Error('Too many connection attempts'));
    }
    next();
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
