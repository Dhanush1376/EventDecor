import http from 'http';
import jwt from 'jsonwebtoken';
import { io as ioClient, Socket } from 'socket.io-client';
import { initSocket } from '../socket';
import mongoose from 'mongoose';

describe('Socket.io namespaces', () => {
  let httpServer: http.Server;
  let port: number;
  const sockets: Socket[] = [];

  beforeAll((done) => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_must_be_at_least_32_chars';
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
    httpServer.close(done);
  });

  const connectClient = (namespace: string, token?: string): Promise<Socket> =>
    new Promise((resolve, reject) => {
      const socket = ioClient(`http://127.0.0.1:${port}${namespace}`, {
        transports: ['websocket'],
        forceNew: true,
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
    if (mongoose.connection.readyState !== 1) {
      process.stdout.write('Skipping socket user test — MongoDB not connected in Jest\n');
      return;
    }

    const User = mongoose.model('User');
    const user = await User.findOne({ isVerified: true }).select('_id role');
    if (!user) {
      process.stdout.write('Skipping socket user test — no verified user in database\n');
      return;
    }

    const token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET as string, {
      expiresIn: '15m',
    });

    const socket = await connectClient('/user', token);
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });
});
