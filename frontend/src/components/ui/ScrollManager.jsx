import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { markScrollSettled } from '../../utils/navigation/sharedElementTransition';

const STORAGE_PREFIX = 'scroll-pos-';
const MAX_RESTORE_FRAMES = 45; // ~750ms for lazily loaded content to grow the page

function readStored(key) {
  try {
    const value = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return value === null ? null : Number.parseInt(value, 10);
  } catch {
    return null;
  }
}

function writeStored(key, value) {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, String(Math.round(value)));
  } catch {
    // Storage full or blocked (private mode): in-memory positions still work for this tab.
  }
}

function scrollToY(top) {
  window.scrollTo({ top, left: 0, behavior: 'instant' });
}

/**
 * The only owner of window scroll on route changes:
 * - Back/Forward restore the position the entry was left at, waiting for content to load.
 * - A new pathname starts at the top (or at #hash when present).
 * - Search-param-only changes (filters, sorting, pagination) keep the current position.
 * Tells the shared element transition when the final position is in place.
 */
export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map());
  const activeKey = useRef(location.key);
  const prevPathname = useRef(null);

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  // Track the position of whichever entry is current. Kept in memory on every scroll so the
  // value is exact at navigation time, and persisted (throttled) for reloads.
  useEffect(() => {
    let persistTimer = null;
    const onScroll = () => {
      positions.current.set(activeKey.current, window.scrollY);
      if (persistTimer) return;
      persistTimer = setTimeout(() => {
        persistTimer = null;
        writeStored(activeKey.current, window.scrollY);
      }, 200);
    };
    const onPageHide = () => writeStored(activeKey.current, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onPageHide);
    return () => {
      clearTimeout(persistTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  useLayoutEffect(() => {
    const previousKey = activeKey.current;
    if (previousKey !== location.key && positions.current.has(previousKey)) {
      writeStored(previousKey, positions.current.get(previousKey));
    }
    activeKey.current = location.key;

    const isFirstRender = prevPathname.current === null;
    const pathnameChanged = !isFirstRender && prevPathname.current !== location.pathname;
    prevPathname.current = location.pathname;

    let frame = null;
    let cancelled = false;
    const cancelOnUserScroll = () => {
      cancelled = true;
    };
    const settle = () => {
      window.removeEventListener('wheel', cancelOnUserScroll);
      window.removeEventListener('touchstart', cancelOnUserScroll);
      window.removeEventListener('keydown', cancelOnUserScroll);
      markScrollSettled(location.key);
    };

    if (navigationType === 'POP') {
      const target = positions.current.get(location.key) ?? readStored(location.key);
      if (target === null || target === undefined || Number.isNaN(target)) {
        if (pathnameChanged) scrollToY(0);
        settle();
        return undefined;
      }
      window.addEventListener('wheel', cancelOnUserScroll, { passive: true });
      window.addEventListener('touchstart', cancelOnUserScroll, { passive: true });
      window.addEventListener('keydown', cancelOnUserScroll);
      let attempts = 0;
      const attempt = () => {
        frame = null;
        if (cancelled) {
          settle();
          return;
        }
        const maxY = document.documentElement.scrollHeight - window.innerHeight;
        scrollToY(Math.min(target, Math.max(0, maxY)));
        attempts += 1;
        if (maxY >= target - 2 || attempts >= MAX_RESTORE_FRAMES) {
          settle();
        } else {
          frame = requestAnimationFrame(attempt);
        }
      };
      attempt();
      return () => {
        if (frame) cancelAnimationFrame(frame);
        settle();
      };
    }

    if (pathnameChanged) {
      let hashTarget = null;
      if (location.hash) {
        try {
          hashTarget = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        } catch {
          hashTarget = null; // malformed escape sequence in the URL
        }
      }
      if (hashTarget) hashTarget.scrollIntoView({ block: 'start' });
      else scrollToY(0);
    }
    settle();
    return undefined;
  }, [location.key, location.pathname, location.hash, navigationType]);

  return null;
}
