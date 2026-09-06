import { useEffect } from 'react';

/**
 * Global hook to manage visual viewport height and keyboard offset
 * This ensures that drawers, modals, and bottom sheets can correctly
 * anchor to the top of the mobile keyboard when it opens.
 */
export function useKeyboardAwareViewport() {
  useEffect(() => {
    // Only run in browser environment and if visualViewport is supported
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const updateViewport = () => {
      const vv = window.visualViewport;
      const fullHeight = window.innerHeight;
      const visibleHeight = vv.height;

      // Calculate how much of the screen is covered by the keyboard (or browser chrome)
      // We use a small threshold to ignore minor browser chrome changes
      const keyboardOffset = Math.max(0, fullHeight - visibleHeight);
      const isKeyboardOpen = keyboardOffset > 150; // Typical mobile keyboard is > 200px

      const doc = document.documentElement;

      // Set CSS variables for global consumption
      doc.style.setProperty('--visual-viewport-height', `${visibleHeight}px`);
      doc.style.setProperty('--keyboard-offset', `${keyboardOffset}px`);

      // Add/remove global class for conditional styling
      if (isKeyboardOpen) {
        doc.classList.add('keyboard-open');
      } else {
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
    };
  }, []);
}
