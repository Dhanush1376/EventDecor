import React from 'react';
import { handleImageError } from '../../utils/imageUtils';

/**
 * Default lazy-loading img wrapper for non-Cloudinary assets.
 * Use CloudinaryImage for CDN URLs; use LazyImage for static/local paths.
 */
export function LazyImage({
  src,
  alt = '',
  className = '',
  loading = 'lazy',
  fetchPriority,
  decoding = 'async',
  ...props
}) {
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      onError={handleImageError}
      className={className}
      {...props}
    />
  );
}
