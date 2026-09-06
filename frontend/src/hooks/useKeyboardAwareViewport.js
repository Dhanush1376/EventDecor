import { useEffect, useRef } from 'react';

/**
 * Global hook to manage visual viewport height and keyboard offset
 * This ensures that drawers, modals, and bottom sheets can correctly
 * anchor to the top of the mobile keyboard when it opens.
 */
export function useKeyboardAwareViewport() {
  const maxHeights = useRef({ portrait: 0, landscape: 0 });

  useEffect(() => {
    // Only run in browser environment and if visualViewport is supported
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const updateViewport = () => {
      const vv = window.visualViewport;
      const visibleHeight = vv.height;

      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      const orientation = isPortrait ? 'portrait' : 'landscape';

      if (visibleHeight > maxHeights.current[orientation]) {
        maxHeights.current[orientation] = visibleHeight;
      }

      // Calculate how much of the screen is covered by the keyboard
      // Because 'interactive-widget=resizes-content' shrinks window.innerHeight,
      // we must compare against the maximum known height for the current orientation.
      const keyboardOffset = Math.max(0, maxHeights.current[orientation] - visibleHeight);
      const isKeyboardOpen = keyboardOffset > 150; // Typical mobile keyboard is > 200px

      const doc = document.documentElement;

      // Set CSS variables for global consumption (kept for backwards compatibility/reference)
      doc.style.setProperty('--visual-viewport-height', `${visibleHeight}px`);
      doc.style.setProperty('--keyboard-offset', `${keyboardOffset}px`);

      // Set safe-area override directly to prevent gap between drawer and keyboard
      if (isKeyboardOpen) {
        doc.style.setProperty('--safe-area-bottom', '0px');
        doc.classList.add('keyboard-open');
      } else {
        doc.style.removeProperty('--safe-area-bottom');
        doc.classList.remove('keyboard-open');
      }
    };

    // Initial calculation
    updateViewport();

    // The resize event fires when the keyboard opens/closes
    window.visualViewport.addEventListener('resize', updateViewport);
    // The scroll event fires when the visual viewport shifts (e.g. when focusing an input)
    window.visualViewport.addEventListener('scroll', updateViewport);

    return () => {
      window.visualViewport.removeEventListener('resize', updateViewport);
      window.visualViewport.removeEventListener('scroll', updateViewport);
      document.documentElement.style.removeProperty('--safe-area-bottom');
    };
  }, []);
}
