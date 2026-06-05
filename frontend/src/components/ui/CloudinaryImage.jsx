import { useState, useEffect, useRef, memo } from 'react';
import {
  getOptimizedUrl,
  getBlurredPlaceholder,
  getSrcSet,
  handleImageError,
} from '../../utils/imageUtils';

function BaseOptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  fetchPriority,
  containerClassName = '',
  sizes = '(max-width: 768px) 100vw, 50vw',
  aspectRatio,
  eager = false,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(eager || loading === 'eager');
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(eager || loading === 'eager');

  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const prevSrcRef = useRef(src);

  // Handle visibility tracking
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
      { rootMargin: '200px 0px' }, // Load 200px before coming into view
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [eager, loading]);

  // Handle actual src changes (reference check bypassed, actual value check)
  useEffect(() => {
    if (src !== prevSrcRef.current) {
      setIsLoaded(eager || loading === 'eager');
      setHasError(false);
      prevSrcRef.current = src;
    }

    const checkComplete = () => {
      if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
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
  // Using only f_auto srcSet to leverage Cloudinary's content negotiation, reducing total URLs generated
  const autoSrcSet = isDataUrl ? null : getSrcSet(src, [320, 640, 1024, 1536]);
  const placeholderUrl = isDataUrl ? null : getBlurredPlaceholder(src);

  const hasPositioning =
    containerClassName.includes('absolute') ||
    containerClassName.includes('fixed') ||
    containerClassName.includes('relative') ||
    containerClassName.includes('sticky');

  const isImageAutoHeight =
    className && (className.includes('h-auto') || className.includes('h-fit'));

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

      {/* Picture tag utilizing Cloudinary's auto-format logic via getSrcSet */}
      {isInView && !hasError && (
        <picture>
          {autoSrcSet && <source srcSet={autoSrcSet} sizes={sizes} />}

          {optimizedUrl && (
            <img
              ref={imgRef}
              src={optimizedUrl}
              alt={alt}
              width={width}
              height={height}
              loading={eager || loading === 'eager' ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={fetchPriority}
              onLoad={() => setIsLoaded(true)}
              onError={(e) => {
                handleImageError(e);
                setHasError(true);
                setIsLoaded(true);
              }}
              className={`w-full ${isImageAutoHeight ? 'h-auto block' : 'h-full object-cover'} rounded-[inherit] transition-opacity duration-500 ease-out will-change-opacity transform-gpu ${className} ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              {...props}
            />
          )}
        </picture>
      )}
    </div>
  );
}

export const OptimizedImage = memo(BaseOptimizedImage);

// Export as CloudinaryImage for backward compatibility
export const CloudinaryImage = OptimizedImage;
