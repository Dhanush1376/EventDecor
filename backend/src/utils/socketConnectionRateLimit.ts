import logger from '../config/logger';
import redisClient from './redis';

const WINDOW_MS = 60_000;
const MAX_CONNECTIONS_PER_IP = 10;

type MemoryEntry = { count: number; resetAt: number };
const memoryCounters = new Map<string, MemoryEntry>();

const getClientIp = (socket: { handshake: { address?: string; headers?: Record<string, string | string[] | undefined> } }): string => {
  const forwarded = socket.handshake.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return socket.handshake.address || 'unknown';
};

export const checkSocketConnectionRateLimit = async (
  socket: { handshake: { address?: string; headers?: Record<string, string | string[] | undefined> } }
): Promise<{ allowed: boolean; ip: string }> => {
  const ip = getClientIp(socket);
  const key = `socket:conn:${ip}`;

  if (redisClient && redisClient.isReady) {
    try {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.pExpire(key, WINDOW_MS);
      }
      return { allowed: count <= MAX_CONNECTIONS_PER_IP, ip };
    } catch (err) {
      logger.warn('[SOCKET] Redis rate-limit check failed, falling back to memory:', err);
    }
  }

  const now = Date.now();
  const entry = memoryCounters.get(ip);
  if (!entry || now > entry.resetAt) {
    memoryCounters.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, ip };
  }

  entry.count += 1;
  return { allowed: entry.count <= MAX_CONNECTIONS_PER_IP, ip };
};
