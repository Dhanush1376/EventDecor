import {
  getCachedData,
  setCachedData,
  getSearchCache,
  setSearchCache,
  autocompleteCache,
} from '../services/search/searchCache';
import redisClient from '../utils/cache/redis';

jest.mock('../utils/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  isReady: true,
}));

describe('SearchCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    autocompleteCache.clear();
  });

  describe('getCachedData', () => {
    it('returns parsed data if redis client is ready and has key', async () => {
      (redisClient!.get as jest.Mock).mockResolvedValue('{"items":["flower"]}');

      const data = await getCachedData('someKey');
      expect(data).toEqual({ items: ['flower'] });
      expect(redisClient!.get).toHaveBeenCalledWith('someKey');
    });

    it('returns null if redis returns null', async () => {
      (redisClient!.get as jest.Mock).mockResolvedValue(null);

      const data = await getCachedData('someKey');
      expect(data).toBeNull();
    });

    it('returns null and logs warning on redis error', async () => {
      (redisClient!.get as jest.Mock).mockRejectedValue(new Error('Connection dropped'));

      const data = await getCachedData('someKey');
      expect(data).toBeNull();
    });
  });

  describe('setCachedData', () => {
    it('sets stringified data in redis with ttl in seconds', async () => {
      await setCachedData('someKey', { test: true }, 5000);

      expect(redisClient!.set).toHaveBeenCalledWith(
        'someKey',
        '{"test":true}',
        { EX: 5 }, // 5000ms = 5s
      );
    });

    it('handles redis error gracefully', async () => {
      (redisClient!.set as jest.Mock).mockRejectedValue(new Error('Connection dropped'));

      await expect(setCachedData('someKey', { test: true }, 5000)).resolves.not.toThrow();
    });
  });

  describe('getSearchCache and setSearchCache', () => {
    it('setSearchCache saves to both Redis and MemoryCache', async () => {
      await setSearchCache('ac', 'query', ['result1'], 10000);

      expect(redisClient!.set).toHaveBeenCalledWith('search:ac:query', '["result1"]', { EX: 10 });
      expect(autocompleteCache.get('query')).toEqual(['result1']);
    });

    it('getSearchCache retrieves from redis if available', async () => {
      (redisClient!.get as jest.Mock).mockResolvedValue('["redisResult"]');

      const res = await getSearchCache('ac', 'query');
      expect(res).toEqual(['redisResult']);
    });

    it('getSearchCache falls back to memory cache if redis misses', async () => {
      (redisClient!.get as jest.Mock).mockResolvedValue(null); // redis miss
      autocompleteCache.set('query', ['memoryResult'], 10000);

      const res = await getSearchCache('ac', 'query');
      expect(res).toEqual(['memoryResult']);
    });
  });
});
