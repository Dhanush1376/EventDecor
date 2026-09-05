import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevPathnameRef = useRef(location.pathname);

  // Save scroll position on unmount/navigation
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(`scroll-pos-${location.key}`, window.scrollY.toString());
    };

    let scrollTimeout;
    const throttledScroll = () => {
      if (!scrollTimeout) {
        scrollTimeout = setTimeout(() => {
          handleScroll();
          scrollTimeout = null;
        }, 150);
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      clearTimeout(scrollTimeout);
      sessionStorage.setItem(`scroll-pos-${location.key}`, window.scrollY.toString());
    };
  }, [location.key]);

  // Restore scroll position or scroll to top on route change
  useEffect(() => {
    const isPathnameChange = prevPathnameRef.current !== location.pathname;
    prevPathnameRef.current = location.pathname;

    // Do NOT scroll to top on in-page query param or hash changes
    if (!isPathnameChange && navigationType !== 'POP') {
      return;
    }

    if (navigationType === 'POP') {
      const savedPos = sessionStorage.getItem(`scroll-pos-${location.key}`);
      if (savedPos !== null) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo({
              top: parseInt(savedPos, 10),
              left: 0,
              behavior: 'instant',
            });
          }, 10);
        });
        return;
      }
    }

    // For actual pathname changes (navigating to a new page)
    if (isPathnameChange) {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant',
        });
      });
    }
  }, [location.key, location.pathname, navigationType]);

  return null;
}
