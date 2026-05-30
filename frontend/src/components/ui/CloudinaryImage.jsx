import React, { useState, useEffect, useRef } from 'react';
import { getOptimizedUrl, getBlurredPlaceholder, getSrcSet, handleImageError } from '../../utils/imageUtils';

export function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = "", 
  loading = "lazy",
  fetchPriority,
  containerClassName = "",
  sizes = "(max-width: 768px) 100vw, 50vw",
  aspectRatio,
  eager = false,
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(eager || loading === 'eager');
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  
  useEffect(() => {
    if (eager || loading === 'eager' || !containerRef.current) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" } // Load 200px before coming into view
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [eager, loading]);

  useEffect(() => {
    setIsLoaded(eager || loading === 'eager');
    setHasError(false);

    const checkComplete = () => {
      if (imgRef.current && imgRef.current.complete) {
        setIsLoaded(true);
      }
    };

    checkComplete();
    const timer = setTimeout(checkComplete, 50);

    return () => clearTimeout(timer);
  }, [src, eager, loading]);

  if (!src) return null;

  const isDataUrl = src.startsWith('data:') || src.startsWith('blob:');
  const optimizedUrl = isDataUrl ? src : getOptimizedUrl(src, width, height);
  const avifSrcSet = isDataUrl ? null : getSrcSet(src, [320, 640, 768, 1024, 1280, 1536], 'avif');
  const webpSrcSet = isDataUrl ? null : getSrcSet(src, [320, 640, 768, 1024, 1280, 1536], 'webp');
  const fallbackSrcSet = isDataUrl ? null : getSrcSet(src, [320, 640, 768, 1024, 1280, 1536]);
  const placeholderUrl = isDataUrl ? null : getBlurredPlaceholder(src);

  const hasPositioning = containerClassName.includes('absolute') || 
                         containerClassName.includes('fixed') || 
                         containerClassName.includes('relative') ||
                         containerClassName.includes('sticky');

  const isImageAutoHeight = className && (className.includes('h-auto') || className.includes('h-fit'));

  const aspectStyle = aspectRatio ? { aspectRatio } : undefined;

  return (
    <div
      ref={containerRef}
      className={`${hasPositioning ? '' : 'relative'} overflow-hidden ${containerClassName}`}
      style={aspectStyle}
    >
      {/* Blurred Progressive Placeholder */}
      {!isLoaded && !hasError && placeholderUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 rounded-[inherit] transition-opacity duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${placeholderUrl})` }}
        />
      )}
      
      {/* Skeleton fallback if there is no placeholder url OR if the image errored */}
      {((!isLoaded && !placeholderUrl) || hasError) && (
        <div className="absolute inset-0 skeleton-box rounded-[inherit]" />
      )}

      {/* Picture tag for AVIF, WebP and Fallback support */}
      {isInView && !hasError && (
        <picture>
          {avifSrcSet && <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />}
          {webpSrcSet && <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />}
          {fallbackSrcSet && <source srcSet={fallbackSrcSet} sizes={sizes} />}
          
          <img
            ref={imgRef}
            src={optimizedUrl}
            alt={alt}
            width={width}
            height={height}
            loading={eager || loading === 'eager' ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={fetchPriority}
            onLoad={() => setIsLoaded(true)}
            onError={(e) => {
              handleImageError(e);
              setHasError(true);
              setIsLoaded(true);
            }}
            className={`w-full ${isImageAutoHeight ? 'h-auto block' : 'h-full object-cover'} rounded-[inherit] transition-all duration-700 ease-out will-change-transform transform-gpu ${className} ${
              isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.03]'
            }`}
            {...props}
          />
        </picture>
      )}
    </div>
  );
}

// Export as CloudinaryImage for backward compatibility
export const CloudinaryImage = OptimizedImage;
