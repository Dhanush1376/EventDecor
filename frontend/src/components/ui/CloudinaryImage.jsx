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
  const [hasError, setHasError] = useState(false);
  
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

  const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23faf9f6"/><path d="M150 100 L250 100 L250 200 L150 200 Z" fill="none" stroke="%23d4af37" stroke-width="1" opacity="0.3"/><text x="50%" y="50%" font-family="Playfair Display, serif" font-size="12" fill="%23735c00" text-anchor="middle" letter-spacing="2">DIGITAL STUDIO</text><text x="50%" y="62%" font-family="Inter, sans-serif" font-size="8" fill="%237f7663" text-anchor="middle" opacity="0.6" letter-spacing="1">COLLECTION IMAGE</text></svg>`;

  return (
    <div
      className={`${hasPositioning ? '' : 'relative'} overflow-hidden ${containerClassName}`}
      style={aspectStyle}
    >
      {/* Blurred Placeholder */}
      {isCloudinary && !isLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 rounded-[inherit] transition-opacity duration-1000"
          style={{ backgroundImage: `url(${placeholderUrl})` }}
        />
      )}
      
      {/* Main Image */}
      <img
        src={hasError ? fallbackSvg : optimizedUrl}
        srcSet={hasError ? undefined : srcSet}
        sizes={sizes}
        alt={hasError ? "Image unavailable" : alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
        className={`w-full h-full object-cover rounded-[inherit] transition-all duration-1000 ease-out ${className} ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
        {...props}
      />
    </div>
  );
}
