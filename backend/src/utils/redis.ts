import { createClient } from 'redis';
export type RedisClientType = ReturnType<typeof createClient>;
import * as Sentry from '@sentry/node';
import logger from '../config/logger';

const redisUrl = process.env.REDIS_URL?.trim();

// Ensure TLS configuration applies for rediss:// protocols
const isTlsRedis = Boolean(redisUrl && (redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io')));

export let redisClient: RedisClientType | null = null;
export let pubClient: RedisClientType | null = null;
export let subClient: RedisClientType | null = null;

const resolveMultiInstance = (): boolean => {
  const explicit = process.env.RENDER_INSTANCE_COUNT || process.env.WEB_CONCURRENCY;
  return Boolean(explicit && Number(explicit) > 1);
};

const createRedisConfig = () => {
  const socketOpts: any = {
    rejectUnauthorized: false,
    connectTimeout: 10000,
    reconnectStrategy: (retries: number) => {
      const delay = Math.min(50 * Math.pow(2, retries), 10000);
      const requireRedis = process.env.REQUIRE_REDIS === 'true';
      const isProduction = process.env.NODE_ENV === 'production';
      const multiInstance = resolveMultiInstance();
      
      if (!requireRedis && !isProduction && !multiInstance && retries > 20) {
        logger.error('[REDIS] Max reconnect attempts reached in local dev. Stopping reconnection.');
        return new Error('Max reconnect attempts reached');
      }
      return delay;
    }
  };

  if (isTlsRedis) {
    socketOpts.tls = true;
  }

  return {
    url: redisUrl,
    socket: socketOpts
  };
};

export const initRedis = async (): Promise<void> => {
  if (!redisUrl) {
    logger.warn('⚠️ REDIS_URL not provided. Running without Redis (Not recommended for multi-instance production).');
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
      client.on('error', (err) => {
        logger.error(`[REDIS ${name}] Error:`, err);
        if (process.env.SENTRY_DSN) {
          Sentry.captureException(err, { tags: { subsystem: 'redis' }, level: 'error' });
        }
      });
      client.on('ready', () => logger.info(`[REDIS ${name}] ready`));
      client.on('reconnecting', () => logger.warn(`[REDIS ${name}] Reconnecting…`));
      client.on('end', () => logger.warn(`[REDIS ${name}] Connection closed`));
    };

    setupListeners(redisClient, 'Client');
    setupListeners(pubClient, 'PubClient');
    setupListeners(subClient, 'SubClient');

    logger.info('Connecting to Redis...');
    
    await Promise.all([
      redisClient.connect(),
      pubClient.connect(),
      subClient.connect(),
    ]);

    logger.info(`✅ Redis Clients Connected successfully${isTlsRedis ? ' (TLS)' : ''}`);

  } catch (err: any) {
    logger.error(`🚨 [REDIS CRITICAL] Failed to connect on startup: ${err.message}`);
    const isProduction = process.env.NODE_ENV === 'production';
    const requireRedis = process.env.REQUIRE_REDIS === 'true';
    const multiInstance = resolveMultiInstance();

    if (requireRedis || (isProduction && multiInstance)) {
      logger.error('REQUIRE_REDIS is set. Exiting process to avoid split-brain.');
      process.exit(1);
    } else {
      logger.warn('Running without Redis fallback (local dev).');
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
    })
  );
  logger.info('[REDIS] All connections closed');
};

export default redisClient;
