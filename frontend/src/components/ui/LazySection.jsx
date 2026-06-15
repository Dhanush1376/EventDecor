import React, { useState, useEffect, useRef, Suspense } from 'react';

/**
 * LazySection
 * High-performance container that defers mounting and rendering of heavy off-screen
 * components until they are scrolled within proximity of the viewport.
 *
 * @param {React.ReactNode} children - The section component to lazily render
 * @param {string} placeholderHeight - Minimum height for CLS prevention
 * @param {React.ReactNode} fallback - Custom skeleton component to show before section loads
 */
export function LazySection({ children, placeholderHeight = '250px', fallback }) {
  const [inView, setInView] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // Proactive exit check if IntersectionObserver is unsupported (older browsers fallback)
    if (!('IntersectionObserver' in window)) {
      const timer = setTimeout(() => setInView(true), 0);
      return () => clearTimeout(timer);
    }

    // Optional: Preload the component chunk during idle time
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(
        () => {
          // If children is a lazy component, React will attempt to load the chunk in the background if we inspect it?
          // Actually, React.lazy chunks load when rendered. We can't easily prefetch just by having it as children unless we trigger it.
          // We will rely on increased rootMargin for now to fetch earlier.
        },
        { timeout: 2000 },
      );
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '800px 0px', // Load 800px before entering viewport to prevent blank sections
        threshold: 0.01,
      },
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

  // Determine the placeholder to show before intersection
  const skeletonPlaceholder = fallback || (
    <div style={{ height: placeholderHeight }} className="w-full" />
  );

  return (
    <div
      ref={containerRef}
      style={{ minHeight: inView ? 'auto' : placeholderHeight }}
      className="lazy-section-container"
    >
      {inView ? (
        <Suspense fallback={skeletonPlaceholder}>{children}</Suspense>
      ) : (
        skeletonPlaceholder
      )}
    </div>
  );
}
