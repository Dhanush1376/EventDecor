import React, { useState } from 'react';
import { getOptimizedUrl, getBlurredPlaceholder, getSrcSet, handleImageError } from '../../utils/imageUtils';

export function CloudinaryImage({ 
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
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  if (!src) return null;

  const isCloudinary = src.includes('cloudinary.com');
  const optimizedUrl = isCloudinary ? getOptimizedUrl(src, width, height) : src;
  const srcSet = isCloudinary ? getSrcSet(src) : null;
  const placeholderUrl = isCloudinary ? getBlurredPlaceholder(src) : null;

  const hasPositioning = containerClassName.includes('absolute') || 
                         containerClassName.includes('fixed') || 
                         containerClassName.includes('relative') ||
                         containerClassName.includes('sticky');

  const aspectStyle = aspectRatio ? { aspectRatio } : undefined;

  return (
    <div
      className={`${hasPositioning ? '' : 'relative'} overflow-hidden ${containerClassName}`}
      style={aspectStyle}
    >
      {/* Blurred Placeholder */}
      {isCloudinary && !isLoaded && (
        <div 
          className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 rounded-[inherit] transition-opacity duration-1000"
          style={{ backgroundImage: `url(${placeholderUrl})` }}
        />
      )}
      
      {/* Main Image */}
      <img
        src={optimizedUrl}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          setIsLoaded(true);
          handleImageError(e);
        }}
        className={`w-full h-full object-cover rounded-[inherit] transition-all duration-1000 ease-out ${className} ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
        {...props}
      />
    </div>
  );
}
