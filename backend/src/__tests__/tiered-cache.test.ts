import { tieredCacheGet, tieredCacheSet } from '../../src/utils/cache/tieredCache';
import { MemoryCache } from '../../src/utils/cache/MemoryCache';
import { redisClient } from '../../src/utils/cache/redis';

jest.mock('../../src/utils/cache/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    isReady: true,
  },
}));

describe('tieredCache', () => {
  let memCache: MemoryCache;
  beforeEach(() => {
    jest.clearAllMocks();
    memCache = new MemoryCache();
  });

  describe('tieredCacheGet', () => {
    it('returns parsed data if redis client is ready and has key', async () => {
      (redisClient!.get as jest.Mock).mockResolvedValue('{"items":["flower"]}');
      const data = await tieredCacheGet('someKey', memCache);
      expect(data).toEqual({ items: ['flower'] });
      expect(redisClient!.get).toHaveBeenCalledWith('someKey');
    });

    it('returns memory cache if redis returns null', async () => {
      (redisClient!.get as jest.Mock).mockResolvedValue(null);
      memCache.set('someKey', { mem: true }, 5000);
      const data = await tieredCacheGet('someKey', memCache);
      expect(data).toEqual({ mem: true });
    });
  });

  describe('tieredCacheSet', () => {
    it('sets data in redis and memory cache', async () => {
      await tieredCacheSet('someKey', { test: true }, 5000, memCache);
      expect(redisClient!.set).toHaveBeenCalledWith('someKey', '{"test":true}', { EX: 5 });
      expect(memCache.get('someKey')).toEqual({ test: true });
    });
  });
});
