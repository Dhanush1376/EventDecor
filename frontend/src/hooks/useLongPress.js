import { useCallback, useRef, useState } from 'react';

export function useLongPress(onLongPress, { shouldPreventDefault = true, delay = 500 } = {}) {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const timeout = useRef();
  const target = useRef();

  const start = useCallback(
    (event) => {
      const targetNode = event.target;
      setIsPressing(true);
      timeout.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
        setIsPressing(false);
        if (shouldPreventDefault && targetNode) {
          targetNode.addEventListener('touchend', preventDefault, { passive: false });
          target.current = targetNode;
        }
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault],
  );

  const clear = useCallback(
    (event) => {
      timeout.current && clearTimeout(timeout.current);
      setLongPressTriggered(false);
      setIsPressing(false);
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault);
        target.current = null;
      }
    },
    [shouldPreventDefault],
  );

  const onTouchMove = useCallback((event) => {
    // Clear long press if the user drags their finger
    timeout.current && clearTimeout(timeout.current);
    setIsPressing(false);
  }, []);

  return {
    longPressTriggered,
    isPressing,
    handlers: {
      onMouseDown: (e) => start(e),
      onTouchStart: (e) => start(e),
      onMouseUp: (e) => clear(e),
      onMouseLeave: (e) => clear(e),
      onTouchEnd: (e) => clear(e),
      onTouchMove: (e) => onTouchMove(e),
    },
  };
}

const preventDefault = (event) => {
  if (event.touches.length < 2 && event.preventDefault) {
    event.preventDefault();
  }
};
