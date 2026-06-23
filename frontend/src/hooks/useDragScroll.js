import { useState, useCallback } from 'react';

export function useDragScroll({ scrollRef, sensitivity = 1.5, boundaryCheck = null }) {
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(
    (e) => {
      const slider = scrollRef?.current;
      if (!slider) return;
      setIsDown(true);
      setStartX(e.pageX - slider.offsetLeft);
      setScrollLeftState(slider.scrollLeft);
    },
    [scrollRef],
  );

  const handleMouseLeave = useCallback(() => {
    setIsDown(false);
    setIsHovered(false);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDown(false);
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      const slider = scrollRef?.current;
      if (!slider || !isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * sensitivity;
      if (Math.abs(walk) > 5) {
        setIsDragging(true);
      }
      slider.scrollLeft = scrollLeftState - walk;

      if (boundaryCheck) {
        boundaryCheck({ slider, e, setScrollLeftState, setStartX });
      }
    },
    [isDown, scrollLeftState, startX, scrollRef, sensitivity, boundaryCheck],
  );

  return {
    isDown,
    isDragging,
    isHovered,
    setIsHovered,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleMouseMove,
  };
}
