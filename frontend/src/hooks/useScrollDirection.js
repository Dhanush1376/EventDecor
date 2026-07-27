import { useState, useEffect } from 'react';

// Global singleton state for scroll tracking
let globalScrollDirection = 'up';
let globalIsAtTop = true;
let ticking = false;
let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
const listeners = new Set();

const updateScrollDirection = () => {
  const scrollY = window.scrollY;

  const currentIsAtTop = scrollY < 50;

  let currentScrollDirection = globalScrollDirection;
  if (Math.abs(scrollY - lastScrollY) >= 10) {
    currentScrollDirection = scrollY > lastScrollY ? 'down' : 'up';
    lastScrollY = scrollY > 0 ? scrollY : 0;
  }

  // Check if anything actually changed
  if (currentIsAtTop !== globalIsAtTop || currentScrollDirection !== globalScrollDirection) {
    globalIsAtTop = currentIsAtTop;
    globalScrollDirection = currentScrollDirection;

    // Notify all listeners
    listeners.forEach((listener) =>
      listener({ scrollDirection: globalScrollDirection, isAtTop: globalIsAtTop }),
    );
  }

  ticking = false;
};

const onScroll = () => {
  if (!ticking) {
    window.requestAnimationFrame(updateScrollDirection);
    ticking = true;
  }
};

// Only attach the window listener once
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', onScroll, { passive: true });
}

export function useScrollDirection() {
  const [state, setState] = useState({
    scrollDirection: globalScrollDirection,
    isAtTop: globalIsAtTop,
  });

  useEffect(() => {
    // Initial sync in case it changed before mount
    setState({
      scrollDirection: globalScrollDirection,
      isAtTop: globalIsAtTop,
    });

    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}
