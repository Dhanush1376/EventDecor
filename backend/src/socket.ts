import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from './config/logger';
import User from './models/User';
import { isOriginAllowed } from './app';

let io: Server;

export const initSocket = (server: HttpServer) => {
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
  });

  // Socket authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      if (!decoded || !decoded.id) {
        return next(new Error('Authentication error: Invalid token'));
      }

      const user = await User.findById(decoded.id).select('role email');
      if (!user || user.role !== 'admin') {
        return next(new Error('Authentication error: Unauthorized user role'));
      }

      (socket as any).user = user;
      next();
    } catch (err) {
      logger.error('Socket Authentication failed:', err);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    logger.info(`Admin socket connected: ${user.email} (${socket.id})`);

    // Join the admin room to receive global admin alerts
    socket.join('admin-alerts');

    socket.on('disconnect', () => {
      logger.info(`Admin socket disconnected: ${user.email} (${socket.id})`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

export const emitAdminNotification = (payload: any) => {
  if (io) {
    io.to('admin-alerts').emit('new_notification', payload);
  } else {
    logger.warn('Tried to emit admin notification but Socket.io is not initialized');
  }
};
