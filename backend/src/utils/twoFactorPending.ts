import redisClient from './redis';

const keyFor = (userId: string) => `2fa:pending:${userId}`;
const TTL_SECONDS = 300;

export const setTwoFactorPending = async (userId: string): Promise<void> => {
  if (!redisClient || !redisClient.isReady) return;
  await redisClient.set(keyFor(userId), '1', { EX: TTL_SECONDS });
};

export const consumeTwoFactorPending = async (userId: string): Promise<boolean> => {
  if (!redisClient || !redisClient.isReady) return true;
  const removed = await redisClient.del(keyFor(userId));
  return removed === 1;
};

export const hasTwoFactorPending = async (userId: string): Promise<boolean> => {
  if (!redisClient || !redisClient.isReady) return true;
  const val = await redisClient.get(keyFor(userId));
  return val === '1';
};
