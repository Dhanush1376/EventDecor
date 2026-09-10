import React, { useState, useEffect, useRef, memo } from 'react';
import { ImageOff } from 'lucide-react';
import {
  getOptimizedUrl,
  handleImageError as globalHandleImageError,
} from '../../utils/media/imageUtils';

export const AdminImage = memo(
  ({ src, alt = '', width = 80, className = '', onError, onLoad, ...props }) => {
    const [error, setError] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
      setLoaded(false);
      setError(false);
      if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
        setLoaded(true);
      }
    }, [src]);

    const isValid =
      src && typeof src === 'string' && src.trim() !== '' && src !== 'undefined' && src !== 'null';

    if (!isValid || error) {
      return (
        <div
          className={`flex flex-col items-center justify-center bg-[#f7f6f2] dark:bg-[#1a1917] text-[#8a877f] dark:text-[#9e9b93] rounded border border-black/5 dark:border-white/5 text-center p-1 select-none overflow-hidden ${className}`}
          style={{ minHeight: '36px', minWidth: '36px' }}
        >
          <ImageOff className="w-3.5 h-3.5 opacity-60 mb-0.5" strokeWidth={1.75} />
          <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 leading-none">
            Unavailable
          </span>
        </div>
      );
    }

    const handleError = (e) => {
      setError(true);
      if (onError) {
        onError(e);
      } else {
        globalHandleImageError(e);
      }
    };

    const handleLoad = (e) => {
      setLoaded(true);
      if (onLoad) {
        onLoad(e);
      }
    };

    const isBlobOrData = src.startsWith('blob:') || src.startsWith('data:');
    const optimizedSrc = isBlobOrData ? src : getOptimizedUrl(src, width);

    return (
      <img
        ref={imgRef}
        src={optimizedSrc}
        alt={alt}
        className={`transition-opacity duration-200 ease-out ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    );
  },
);

AdminImage.displayName = 'AdminImage';
