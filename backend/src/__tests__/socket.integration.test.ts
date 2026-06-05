/// <reference types="jest" />

import http from 'http';
import jwt from 'jsonwebtoken';
import { io as ioClient, Socket } from 'socket.io-client';

jest.mock('../config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../app', () => ({
  isOriginAllowed: jest.fn(() => true),
}));

jest.mock('../utils/redis', () => ({
  __esModule: true,
  default: null,
  pubClient: null,
  subClient: null,
  pingRedis: jest.fn(async () => 'not_configured' as const),
}));

jest.mock('../utils/socketConnectionRateLimit', () => ({
  checkSocketConnectionRateLimit: jest.fn(async () => ({ allowed: true, ip: '127.0.0.1' })),
}));

jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

import User from '../models/User';
import { initSocket, getIO } from '../socket';

const mockFindById = User.findById as jest.Mock;

describe('Socket.io namespaces', () => {
  let httpServer: http.Server;
  let port: number;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret_must_be_at_least_32_chars';
    process.env.NODE_ENV = 'test';
    delete process.env.REDIS_URL;

    httpServer = http.createServer();
    initSocket(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        port = typeof addr === 'object' && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    sockets.forEach((s) => {
      if (s.connected) s.disconnect();
    });

    await new Promise<void>((resolve) => {
      getIO().close(() => resolve());
    });

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  const connectClient = (namespace: string, token?: string): Promise<Socket> =>
    new Promise((resolve, reject) => {
      const socket = ioClient(`http://127.0.0.1:${port}${namespace}`, {
        transports: ['websocket'],
        forcereturnDocument: 'after',
        reconnection: false,
        auth: token ? { token } : {},
      });
      sockets.push(socket);

      const timer = setTimeout(() => {
        socket.disconnect();
        reject(new Error('connect timeout'));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timer);
        resolve(socket);
      });
      socket.on('connect_error', (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });

  beforeEach(() => {
    mockFindById.mockReset();
  });

  it('rejects /user connection without JWT', async () => {
    await expect(connectClient('/user')).rejects.toThrow();
  });

  it('rejects /admin connection without JWT', async () => {
    await expect(connectClient('/admin')).rejects.toThrow();
  });

  it('rejects /user connection with invalid JWT', async () => {
    await expect(connectClient('/user', 'not-a-valid-jwt')).rejects.toThrow();
  });

  it('accepts /user connection with valid JWT when user exists', async () => {
    mockFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: { toString: () => 'mock_user_id' },
        role: 'customer',
        email: 'test@example.com',
        isVerified: true,
      }),
    });

    const token = jwt.sign(
      { id: 'mock_user_id', role: 'customer' },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m' },
    );

    const socket = await connectClient('/user', token);
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });
});
