import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWindowHeight } from '../useWindowHeight';

describe('useWindowHeight Custom Hook', () => {
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    // Reset window height before each test
    window.innerHeight = 800;
  });

  afterEach(() => {
    // Restore original window innerHeight
    window.innerHeight = originalInnerHeight;
    vi.restoreAllMocks();
  });

  it('initializes with the current window.innerHeight', () => {
    window.innerHeight = 950;
    const { result } = renderHook(() => useWindowHeight());
    expect(result.current).toBe(950);
  });

  it('updates the tracked height reactively when the window is resized', () => {
    const { result } = renderHook(() => useWindowHeight());
    expect(result.current).toBe(800);

    // Simulate resizing window to mobile portrait height
    act(() => {
      window.innerHeight = 640;
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(640);
  });

  it('unmounts cleanly by removing the resize event listener from window', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useWindowHeight());
    expect(removeEventListenerSpy).not.toHaveBeenCalled();

    // Unmount hook
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
