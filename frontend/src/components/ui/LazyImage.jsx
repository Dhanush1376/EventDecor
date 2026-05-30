import React, { useState, useRef, useEffect } from "react";
import { OptimizedImage } from "./OptimizedImage";

/**
 * Enhanced lazy image component with IntersectionObserver,
 * smooth fade-in reveal, skeleton placeholder, and error state.
 */
export function LazyImage({
  src,
  alt,
  className = "",
  containerClassName = "",
  width,
  height,
  sizes = "(max-width: 768px) 100vw, 50vw",
  aspectRatio,
  eager = false,
  ...props
}) {
  const [isInView, setIsInView] = useState(eager);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (eager || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" } // Start loading 200px before visible
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [eager]);

  const aspectStyle = aspectRatio ? { aspectRatio } : undefined;

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${containerClassName}`}
      style={aspectStyle}
    >
      {/* Skeleton placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 skeleton-box rounded-[inherit]" />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-surface-container flex flex-col items-center justify-center rounded-[inherit]">
          <span className="material-symbols-outlined text-[24px] text-on-surface-variant/30 mb-1">
            broken_image
          </span>
          <span className="text-[10px] text-on-surface-variant/40 font-label uppercase tracking-wider">
            Image unavailable
          </span>
        </div>
      )}

      {/* Actual image — only render src when in view */}
      {isInView && !hasError && (
        <OptimizedImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          priority={eager}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
          className={`w-full h-full object-cover rounded-[inherit] transition-all duration-500 ${className} ${
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
          }`}
          style={{ transitionTimingFunction: "var(--ease-smooth)" }}
          {...props}
        />
      )}
    </div>
  );
}
