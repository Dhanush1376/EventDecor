import React, { useState, memo } from 'react';
import {
  getOptimizedUrl,
  handleImageError as globalHandleImageError,
} from '../../utils/media/imageUtils';

export const AdminImage = memo(
  ({ src, alt = '', width = 80, className = '', onError, ...props }) => {
    const [error, setError] = useState(false);

    if (!src) return null;

    const handleError = (e) => {
      setError(true);
      if (onError) {
        onError(e);
      } else {
        globalHandleImageError(e);
      }
    };

    // Skip optimization for blobs, data URIs, or if it errored out
    if (error || src.startsWith('blob:') || src.startsWith('data:')) {
      return (
        <img
          src={src}
          alt={alt}
          className={className}
          loading="lazy"
          decoding="async"
          onError={handleError}
          {...props}
        />
      );
    }

    const optimizedSrc = getOptimizedUrl(src, width);

    return (
      <img
        src={optimizedSrc}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        onError={handleError}
        {...props}
      />
    );
  },
);

AdminImage.displayName = 'AdminImage';
