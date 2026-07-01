import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMediaQuery } from '../useMediaQuery';

describe('useMediaQuery Custom Hook', () => {
  let listeners = [];
  let matchesValue = false;

  beforeEach(() => {
    listeners = [];
    matchesValue = false;

    // Define mock matchMedia globally
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query) => ({
        get matches() {
          return matchesValue;
        },
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event, callback) => {
          listeners.push(callback);
        }),
        removeEventListener: vi.fn((event, callback) => {
          listeners = listeners.filter((l) => l !== callback);
        }),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false initially when media query does not match', () => {
    matchesValue = false;
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
  });

  it('returns true initially when media query matches', () => {
    matchesValue = true;
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('reactively updates returned value when media query triggers change event listeners', () => {
    matchesValue = false;
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);

    // Simulate change: screen resized to wide desktop
    matchesValue = true;

    // Trigger listeners
    act(() => {
      listeners.forEach((listener) => listener());
    });

    expect(result.current).toBe(true);
  });

  it('cleans up and removes the resize change listener upon unmounting hook', () => {
    const addEventListenerSpy = vi.fn();
    const removeEventListenerSpy = vi.fn();

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
      })),
    );

    const { unmount } = renderHook(() => useMediaQuery('(max-width: 480px)'));

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(removeEventListenerSpy).not.toHaveBeenCalled();

    // Unmount hook
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
  });
});
