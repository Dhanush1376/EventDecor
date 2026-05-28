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

  const aspectStyle = aspectRatio ? { aspectRatio } : undefined;

  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23faf9f6"/><path d="M150 100 L250 100 L250 200 L150 200 Z" fill="none" stroke="%23d4af37" stroke-width="1" opacity="0.3"/><text x="50%" y="50%" font-family="Playfair Display, serif" font-size="12" fill="%23735c00" text-anchor="middle" letter-spacing="2">DIGITAL STUDIO</text><text x="50%" y="62%" font-family="Inter, sans-serif" font-size="8" fill="%237f7663" text-anchor="middle" opacity="0.6" letter-spacing="1">COLLECTION IMAGE</text></svg>`;

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
      
      {/* Skeleton fallback if there is no placeholder url */}
      {!isLoaded && !hasError && !placeholderUrl && (
        <div className="absolute inset-0 skeleton-box rounded-[inherit]" />
      )}

      {/* Picture tag for AVIF, WebP and Fallback support */}
      {isInView && (
        <picture>
          {!hasError && avifSrcSet && <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />}
          {!hasError && webpSrcSet && <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />}
          {!hasError && fallbackSrcSet && <source srcSet={fallbackSrcSet} sizes={sizes} />}
          
          <img
            src={hasError ? fallbackSvg : optimizedUrl}
            alt={hasError ? "Image unavailable" : alt}
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
            className={`w-full h-full object-cover rounded-[inherit] transition-all duration-700 ease-out ${className} ${
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
