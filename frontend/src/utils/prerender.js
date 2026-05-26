/**
 * Detects if the current environment is running inside a static pre-rendering
 * tool such as react-snap (which runs Puppeteer).
 * 
 * @returns {boolean}
 */
export const isPrerendering = () => {
  if (typeof window === 'undefined') return true;
  return (
    window.navigator.userAgent?.includes?.('ReactSnap') ||
    !!window.__snapshot ||
    !!window.snapSaveState
  );
};
