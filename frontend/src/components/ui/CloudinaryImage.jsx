import { ImageOff } from 'lucide-react';
/* eslint-disable */
import { useState, useEffect, useRef, memo, useMemo } from 'react';
import {
  getOptimizedUrl,
  getSrcSet,
  handleImageError,
  getBlurDataUri,
} from '../../utils/media/imageUtils';
import { perfMonitor } from '../../utils/performance/performanceMonitor';

function BaseOptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  fetchPriority,
  containerClassName = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  aspectRatio,
  eager = false,
  skipObserver = false,
  priority,
  quality,
  fallback,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // If skipObserver is true, we immediately treat it as in view
  // (the parent component is responsible for visibility gating)
  const [isInView, setIsInView] = useState(eager || loading === 'eager' || skipObserver);

  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const prevSrcRef = useRef(src);
  const loadStartTime = useRef(Date.now());

  // Handle visibility tracking
  useEffect(() => {
    if (eager || loading === 'eager' || skipObserver || !containerRef.current) {
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
  }, [eager, loading, skipObserver]);

  // Reset load start time when image enters viewport to prevent massive false-positive performance loading warnings
  useEffect(() => {
    if (isInView) {
      loadStartTime.current = Date.now();
    }
  }, [isInView]);

  // Handle actual src changes (reference check bypassed, actual value check)
  useEffect(() => {
    if (src !== prevSrcRef.current) {
      setIsLoaded(false);
      setHasError(false);
      setRetryCount(0);
      prevSrcRef.current = src;
      loadStartTime.current = Date.now();
    }

    const checkComplete = () => {
      if (
        imgRef.current &&
        imgRef.current.complete &&
        imgRef.current.naturalWidth > 0 &&
        !isLoaded
      ) {
        setIsLoaded(true);
      }
    };

    checkComplete();
    const timer = setTimeout(checkComplete, 50);

    return () => clearTimeout(timer);
  }, [src, eager, loading]);

  const { optimizedUrl, autoSrcSet } = useMemo(() => {
    const isData = src && (src.startsWith('data:') || src.startsWith('blob:'));
    let url = isData ? src : src ? getOptimizedUrl(src, width, height, quality) : '';
    if (retryCount > 0 && url && !isData) {
      url += (url.includes('?') ? '&' : '?') + `retry=${retryCount}`;
    }
    const srcSet = isData || !src ? null : getSrcSet(src, width, quality);
    return { optimizedUrl: url, autoSrcSet: srcSet };
  }, [src, width, height, retryCount, quality]);

  const { hasPositioning, isImageAutoHeight, hasObjectFit } = useMemo(
    () => ({
      hasPositioning:
        containerClassName.includes('absolute') ||
        containerClassName.includes('fixed') ||
        containerClassName.includes('relative') ||
        containerClassName.includes('sticky'),
      isImageAutoHeight: className && (className.includes('h-auto') || className.includes('h-fit')),
      hasObjectFit:
        className &&
        (className.includes('object-contain') ||
          className.includes('object-cover') ||
          className.includes('object-fill') ||
          className.includes('object-none') ||
          className.includes('object-scale-down')),
    }),
    [containerClassName, className],
  );

  const isValidSrc = useMemo(() => {
    if (!src || typeof src !== 'string') return false;
    const trimmed = src.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return false;
    return true;
  }, [src]);

  const aspectStyle = aspectRatio
    ? { aspectRatio }
    : width && height
      ? { aspectRatio: `${width}/${height}` }
      : undefined;
  const blurPlaceholder = useMemo(
    () => getBlurDataUri(width || 400, height || 300),
    [width, height],
  );

  if (!isValidSrc) {
    return (
      <div
        ref={containerRef}
        className={`${hasPositioning ? '' : 'relative'} overflow-hidden rounded-[inherit] w-full h-full min-h-[80px] ${containerClassName}`}
        style={aspectStyle}
      >
        {fallback || (
          <div className="absolute inset-0 rounded-[inherit] flex flex-col items-center justify-center bg-[#f7f6f2] dark:bg-[#1a1917] text-[#8a877f] dark:text-[#9e9b93] select-none p-3 text-center border border-black/5 dark:border-white/5 z-10">
            <div className="w-10 h-10 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mb-1.5 shadow-xs">
              <ImageOff className="w-5 h-5 opacity-70" strokeWidth={1.75} />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-80 font-sans">
              Image Unavailable
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${hasPositioning ? '' : 'relative'} overflow-hidden rounded-[inherit] ${containerClassName}`}
      style={aspectStyle}
    >
      {/* Blurred Progressive Placeholder */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 bg-cover bg-center rounded-[inherit] transition-opacity duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${blurPlaceholder})` }}
        />
      )}

      {/* Fallback if the image errored */}
      {hasError &&
        (fallback || (
          <div className="absolute inset-0 rounded-[inherit] flex flex-col items-center justify-center bg-[#f7f6f2] dark:bg-[#1a1917] text-[#8a877f] dark:text-[#9e9b93] select-none p-3 text-center border border-black/5 dark:border-white/5 z-10">
            <div className="w-10 h-10 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mb-1.5 shadow-xs">
              <ImageOff className="w-5 h-5 opacity-70" strokeWidth={1.75} />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-80 font-sans">
              Image Unavailable
            </span>
          </div>
        ))}

      {/* Native img tag with srcset to prevent duplicate downloads */}
      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={optimizedUrl}
          srcSet={autoSrcSet || undefined}
          sizes={autoSrcSet ? sizes : undefined}
          alt={alt}
          width={width}
          height={height}
          loading={eager || loading === 'eager' ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={fetchPriority || (eager ? 'high' : 'auto')}
          onLoad={() => {
            setIsLoaded(true);
            if (perfMonitor && perfMonitor.trackImageLoad) {
              const loadTime = Date.now() - loadStartTime.current;
              perfMonitor.trackImageLoad(src, loadTime);
            }
          }}
          onError={(e) => {
            handleImageError(e);
            setHasError(true);
            setIsLoaded(true);
          }}
          className={`w-full ${isImageAutoHeight ? 'h-auto block' : `h-full ${hasObjectFit ? '' : 'object-cover'}`} rounded-[inherit] transition-opacity duration-300 ease-out transform-gpu ${className} ${
            isLoaded ? 'opacity-100' : 'opacity-0 will-change-opacity'
          }`}
          {...props}
        />
      )}
    </div>
  );
}

export const OptimizedImage = memo(BaseOptimizedImage);

// Export as CloudinaryImage for backward compatibility
export const CloudinaryImage = OptimizedImage;
