import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hasSessionMarker,
  setSessionMarker,
  clearSessionMarker,
  setFallbackRefreshToken,
  getFallbackRefreshToken,
  clearFallbackRefreshToken,
  clearAuthStorage,
  SESSION_MARKER_KEY,
  REFRESH_TOKEN_KEY,
} from '../auth/authStorage';
import { persistentStorage } from '../storage/persistentStorage';

vi.mock('./persistentStorage', () => ({
  persistentStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('authStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Session Marker', () => {
    it('hasSessionMarker returns true if stored value is "true"', () => {
      persistentStorage.getItem.mockReturnValue('true');
      expect(hasSessionMarker()).toBe(true);
      expect(persistentStorage.getItem).toHaveBeenCalledWith(SESSION_MARKER_KEY, {
        fallback: 'false',
      });
    });

    it('hasSessionMarker returns false if stored value is not "true"', () => {
      persistentStorage.getItem.mockReturnValue('false');
      expect(hasSessionMarker()).toBe(false);
    });

    it('setSessionMarker sets value to "true"', () => {
      setSessionMarker();
      expect(persistentStorage.setItem).toHaveBeenCalledWith(SESSION_MARKER_KEY, 'true');
    });

    it('clearSessionMarker removes the key', () => {
      clearSessionMarker();
      expect(persistentStorage.removeItem).toHaveBeenCalledWith(SESSION_MARKER_KEY);
    });
  });

  describe('Fallback Refresh Token', () => {
    it('setFallbackRefreshToken sets token if provided', () => {
      setFallbackRefreshToken('test-token');
      expect(persistentStorage.setItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'test-token');
    });

    it('setFallbackRefreshToken does nothing if token is falsy', () => {
      setFallbackRefreshToken('');
      expect(persistentStorage.setItem).not.toHaveBeenCalled();
    });

    it('getFallbackRefreshToken retrieves the token', () => {
      persistentStorage.getItem.mockReturnValue('test-token');
      expect(getFallbackRefreshToken()).toBe('test-token');
      expect(persistentStorage.getItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, { fallback: null });
    });

    it('clearFallbackRefreshToken removes the token', () => {
      clearFallbackRefreshToken();
      expect(persistentStorage.removeItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
    });
  });

  describe('clearAuthStorage', () => {
    it('clears both session marker and fallback token', () => {
      clearAuthStorage();
      expect(persistentStorage.removeItem).toHaveBeenCalledWith(SESSION_MARKER_KEY);
      expect(persistentStorage.removeItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
    });
  });
});
