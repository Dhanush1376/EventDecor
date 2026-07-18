import { createClient } from 'redis';
export type RedisClientType = ReturnType<typeof createClient>;
import * as Sentry from '@sentry/node';
import logger from '../../config/logger';

export let redisAlertHandler: (title: string, details: any) => Promise<void> = async () => {};
export const setRedisAlertHandler = (handler: typeof redisAlertHandler) => {
  redisAlertHandler = handler;
};
const getRedisUrl = () => {
  const url = process.env.REDIS_URL?.trim();
  if (url === 'redis://dummy.example.com:6379') return undefined;
  return url;
};
const isTlsRedis = () => {
  const url = getRedisUrl();
  return Boolean(url && (url.startsWith('rediss://') || url.includes('upstash.io')));
};

export let redisClient: RedisClientType | null = null;
export let pubClient: RedisClientType | null = null;
export let subClient: RedisClientType | null = null;

const resolveMultiInstance = (): boolean => {
  const explicit = process.env.RENDER_INSTANCE_COUNT || process.env.WEB_CONCURRENCY;
  return Boolean(explicit && Number(explicit) > 1);
};

const createRedisConfig = () => {
  const socketOpts: any = {
    // SECURITY: Default to verifying TLS certificates (Upstash/Redis Cloud use valid certs).
    // Override with REDIS_REJECT_UNAUTHORIZED=false only for self-signed dev certs.
    rejectUnauthorized: process.env.REDIS_REJECT_UNAUTHORIZED !== 'false',
    connectTimeout: 10000,
    family: 4, // Fix for Node 18+ ENOTFOUND IPv6 resolution issues with Upstash
    reconnectStrategy: (retries: number, cause: Error) => {
      if (cause && cause.message && cause.message.includes('max requests limit exceeded')) {
        return new Error('Upstash Free Limit Exceeded. Stopping reconnect strategy.');
      }

      const delay = Math.min(50 * Math.pow(2, retries), 10000);
      const requireRedis = process.env.REQUIRE_REDIS === 'true';
      const isProduction = process.env.NODE_ENV === 'production';
      const multiInstance = resolveMultiInstance();

      if (!requireRedis && !isProduction && !multiInstance && retries > 20) {
        logger.error('[REDIS] Max reconnect attempts reached in local dev. Stopping reconnection.');
        return new Error('Max reconnect attempts reached');
      }

      if (isProduction && retries > 10 && retries % 10 === 0) {
        redisAlertHandler('Redis Reconnection Loop', {
          error: `Redis has been trying to reconnect for ${retries} attempts.`,
        }).catch((e) => logger.error('Alert failed:', e));
      }

      return delay;
    },
  };

  if (isTlsRedis()) {
    socketOpts.tls = true;
  }

  return {
    url: getRedisUrl(),
    socket: socketOpts,
  };
};

export const initRedis = async (): Promise<void> => {
  if (!getRedisUrl()) {
    logger.warn(
      '⚠️ REDIS_URL not provided. Running without Redis (Not recommended for multi-instance production).',
    );
    return;
  }

  try {
    const config = createRedisConfig();

    redisClient = createClient(config);
    pubClient = createClient(config);
    subClient = createClient(config);
    // Prevent Node event listener leaks
    redisClient.setMaxListeners(30);
    pubClient.setMaxListeners(30);
    subClient.setMaxListeners(30);

    const setupListeners = (client: RedisClientType, name: string) => {
      client.on('error', (err: any) => {
        if (err.message && err.message.includes('max requests limit exceeded')) {
          if (!(global as any).upstashDisconnectLogged) {
            logger.error(
              `[REDIS ${name}] Upstash Free Limit Exceeded. Gracefully disconnecting to prevent reconnect loops.`,
            );
            if (process.env.NODE_ENV === 'production') {
              redisAlertHandler('Redis Max Limit Exceeded', {
                error: 'Upstash Free Limit Exceeded, disconnecting Redis.',
              }).catch((e) => logger.error('Alert failed:', e));
            }
            (global as any).upstashDisconnectLogged = true;
          }
          // Disconnect immediately so node-redis stops the infinite auto-reconnect cycle
          client.disconnect().catch(() => {});
        } else if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
          logger.warn(`[REDIS ${name}] Transient network issue (${err.code}).`);
          if (process.env.NODE_ENV === 'production' && !(global as any).redisDisconnectAlerted) {
            redisAlertHandler('Redis Disconnected', {
              error: err.message,
              code: err.code,
            }).catch(() => {});
            (global as any).redisDisconnectAlerted = true;
          }
        } else if (
          err.message &&
          (err.message.includes('Connection is closed') || err.message.includes('closed'))
        ) {
          // Suppress connection closed logs after limit disconnects
          return;
        } else {
          logger.error(`[REDIS ${name}] Error: ${err.message}`);
          if (process.env.SENTRY_DSN) {
            Sentry.captureException(err, { tags: { subsystem: 'redis' }, level: 'error' });
          }
        }
      });
      client.on('ready', () => {
        logger.info(`[REDIS ${name}] ready`);
        (global as any).redisDisconnectAlerted = false; // Reset alert so it can fire again if it goes down later
      });
      client.on('reconnecting', () => logger.warn(`[REDIS ${name}] Reconnecting…`));
      client.on('end', () => logger.warn(`[REDIS ${name}] Connection closed`));
    };

    setupListeners(redisClient, 'Client');
    setupListeners(pubClient, 'PubClient');
    setupListeners(subClient, 'SubClient');

    logger.info('Connecting to Redis...');

    await Promise.all([redisClient.connect(), pubClient.connect(), subClient.connect()]);

    logger.info(`Redis Clients Connected successfully${isTlsRedis() ? '(TLS)' : ''}`);
  } catch (err: any) {
    logger.error(`[REDIS CRITICAL] Failed to connect on startup: ${err.message}`);
    const isProduction = process.env.NODE_ENV === 'production';
    const requireRedis = process.env.REQUIRE_REDIS === 'true';
    const multiInstance = resolveMultiInstance();

    if (requireRedis || (isProduction && multiInstance)) {
      logger.error('REQUIRE_REDIS is set. Exiting process to avoid split-brain.');
      process.exit(1);
    } else {
      logger.warn('Running without Redis fallback (local dev).');
      if (isProduction) {
        redisAlertHandler('Redis Fallback Mode', {
          error: 'Redis initialization failed. Running in memory fallback mode.',
        }).catch((e) => logger.error('Alert failed:', e));
      }
      redisClient = null;
      pubClient = null;
      subClient = null;
    }
  }
};

export const pingRedis = async (): Promise<'up' | 'down' | 'not_configured'> => {
  if (!redisClient || !redisClient.isReady) return 'not_configured';
  try {
    const pong = await redisClient.ping();
    return pong === 'PONG' ? 'up' : 'down';
  } catch {
    return 'down';
  }
};

export const closeRedisConnections = async (): Promise<void> => {
  const clients = [subClient, pubClient, redisClient].filter(Boolean) as RedisClientType[];
  await Promise.all(
    clients.map(async (client) => {
      try {
        await client.quit();
      } catch {
        client.disconnect();
      }
    }),
  );
  logger.info('[REDIS] All connections closed');
};

export default redisClient;
