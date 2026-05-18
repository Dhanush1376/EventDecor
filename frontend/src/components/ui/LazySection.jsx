import React, { useState, useEffect, useRef, Suspense } from 'react';

/**
 * LazySection
 * High-performance container that defers mounting and rendering of heavy off-screen
 * components until they are scrolled within proximity of the viewport.
 */
export function LazySection({ children, placeholderHeight = '250px', fallback }) {
  const [inView, setInView] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // Proactive exit check if IntersectionObserver is unsupported (older browsers fallback)
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '250px 0px', // Load 250px before entering viewport for seamless UX
        threshold: 0.01,
      }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (observer && currentRef) {
        observer.disconnect();
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ minHeight: inView ? 'auto' : placeholderHeight }}
      className="lazy-section-container"
    >
      {inView ? (
        <Suspense fallback={fallback || <div style={{ height: placeholderHeight }} className="w-full bg-stone-50/50 animate-pulse" />}>
          {children}
        </Suspense>
      ) : (
        fallback || <div style={{ height: placeholderHeight }} className="w-full bg-stone-50/50 animate-pulse" />
      )}
    </div>
  );
}
