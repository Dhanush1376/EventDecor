import { useState } from 'react';

/**
 * Enhanced lazy image component with
 * error state handling. Delegates observation to OptimizedImage.
 */
export function LazyImage({
  src,
  alt,
  className = '',
  containerClassName = '',
  width,
  height,
  sizes = '(max-width: 768px) 100vw, 50vw',
  aspectRatio,
  eager = false,
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const aspectStyle = aspectRatio ? { aspectRatio } : undefined;

  return (
    <div className={`relative overflow-hidden ${containerClassName}`} style={aspectStyle}>
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

      {/* Actual image — observation handled by OptimizedImage */}
      {!hasError && (
        <OptimizedImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={eager ? 'eager' : 'lazy'}
          priority={eager}
          onError={() => {
            setHasError(true);
          }}
          className={`w-full h-full object-cover rounded-[inherit] ${className}`}
          {...props}
        />
      )}
    </div>
  );
}
