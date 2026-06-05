import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();

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
      // Save exact position immediately before unmount
      sessionStorage.setItem(`scroll-pos-${location.key}`, window.scrollY.toString());
    };
  }, [location.key]);

  // Restore scroll position or scroll to top on route change
  useEffect(() => {
    if (navigationType === 'POP') {
      const savedPos = sessionStorage.getItem(`scroll-pos-${location.key}`);
      if (savedPos !== null) {
        // Use requestAnimationFrame to ensure DOM is ready and painted
        requestAnimationFrame(() => {
          // A small timeout helps if the page is rendering skeleton or loading content asynchronously
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

    // For PUSH, REPLACE, or if no saved position exists
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
    });
  }, [location.key, navigationType]);

  return null;
}
