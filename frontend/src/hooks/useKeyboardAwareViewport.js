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
      // We rely on window.screen.height or a maximum observed height
      // because in Safari 17.4+ with interactive-widget=resizes-content,
      // window.innerHeight shrinks and equals vv.height when the keyboard is open.

      // Calculate how much the visual viewport has shrunk relative to its normal size
      // We use document.documentElement.clientHeight which represents the layout viewport.
      // If layout viewport shrinks natively (modern Safari), keyboardOffset will be 0.
      // If layout viewport stays full (older Safari), keyboardOffset will be the keyboard height.
      const layoutHeight = document.documentElement.clientHeight;
      const keyboardOffset = Math.max(0, layoutHeight - vv.height);
      const isKeyboardOpen = window.screen.height - vv.height > 150;

      const doc = document.documentElement;

      // Set CSS variables for global consumption
      doc.style.setProperty('--visual-viewport-height', `${vv.height}px`);
      doc.style.setProperty('--keyboard-offset', `${keyboardOffset}px`);

      // Add/remove global class for conditional styling if any component still uses it
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
