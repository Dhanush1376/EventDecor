import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * useMobileDrawerEngine
 * Standardized interaction engine for mobile bottom sheets and drawers across the app.
 * Provides:
 * - Responsive mobile detection (< 640px)
 * - Safe background body scroll locking with clean restoration
 * - Framer Motion Android Material drag-to-dismiss gesture props
 * - Standardized cubic-bezier easing curves
 */
export function useMobileDrawerEngine({
  isOpen = false,
  onClose,
  breakpoint = 640,
  dismissThreshold = 80,
  velocityThreshold = 300,
  axis = 'y',
} = {}) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  // Responsive listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);

    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    } else {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, [breakpoint]);

  // Background scroll lock
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isOpen]);

  // Dismiss callback for drag gesture
  const handleDragEnd = useCallback(
    (_, info) => {
      if (!onClose) return;

      if (axis === 'y') {
        const offset = info.offset?.y || 0;
        const velocity = info.velocity?.y || 0;
        if (offset > dismissThreshold || velocity > velocityThreshold) {
          onClose();
        }
      } else if (axis === 'x') {
        const offset = info.offset?.x || 0;
        const velocity = info.velocity?.x || 0;
        if (offset > dismissThreshold || velocity > velocityThreshold) {
          onClose();
        }
      }
    },
    [onClose, dismissThreshold, velocityThreshold, axis],
  );

  // Framer Motion drag props for the sheet element
  const dragProps = useMemo(() => {
    if (!isMobile) return {};

    if (axis === 'x') {
      return {
        drag: 'x',
        dragDirectionLock: true,
        dragConstraints: { left: 0, right: 0 },
        dragElastic: { left: 0.05, right: 0.5 },
        onDragEnd: handleDragEnd,
      };
    }

    return {
      drag: 'y',
      dragDirectionLock: true,
      dragConstraints: { top: 0, bottom: 0 },
      dragElastic: { top: 0.05, bottom: 0.5 },
      onDragEnd: handleDragEnd,
    };
  }, [isMobile, axis, handleDragEnd]);

  // Standard Material Ease Transition
  const sheetTransition = useMemo(
    () => ({
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1],
    }),
    [],
  );

  return {
    isMobile,
    dragProps,
    sheetTransition,
  };
}
