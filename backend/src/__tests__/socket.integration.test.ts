import http from 'http';
import jwt from 'jsonwebtoken';
import { io as ioClient, Socket } from 'socket.io-client';

// Mock the User model BEFORE it is imported by socket.ts
jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

import User from '../models/User';
import { initSocket, getIO } from '../socket';

describe('Socket.io namespaces', () => {
  let httpServer: http.Server;
  let port: number;
  const sockets: Socket[] = [];

  beforeAll((done) => {
    process.env.JWT_SECRET = 'test_jwt_secret_must_be_at_least_32_chars';
    httpServer = http.createServer();
    initSocket(httpServer);
    httpServer.listen(0, () => {
      const addr = httpServer.address();
      port = typeof addr === 'object' && addr ? addr.port : 0;
      done();
    });
  });

  afterAll((done) => {
    sockets.forEach((s) => s.disconnect());
    getIO().close(() => {
      done();
    });
  });

  const connectClient = (namespace: string, token?: string): Promise<Socket> =>
    new Promise((resolve, reject) => {
      const socket = ioClient(`http://127.0.0.1:${port}${namespace}`, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false, // Prevents open handles from automatic retries
        auth: token ? { token } : {},
      });
      sockets.push(socket);
      const timer = setTimeout(() => reject(new Error('connect timeout')), 5000);
      socket.on('connect', () => {
        clearTimeout(timer);
        resolve(socket);
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
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
    // Mock the DB call made by socketAuthMiddleware
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'mock_user_id',
        role: 'customer',
        email: 'test@example.com',
        isVerified: true
      })
    });

    const token = jwt.sign({ id: 'mock_user_id', role: 'customer' }, process.env.JWT_SECRET as string, {
      expiresIn: '15m',
    });

    const socket = await connectClient('/user', token);
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });
});
