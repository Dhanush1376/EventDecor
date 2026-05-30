import React, { useState, useEffect, useRef } from 'react';

/**
 * OptimizedImage Component
 * 
 * A drop-in replacement for standard <img> tags that provides Next.js-like image
 * optimization capabilities using Cloudinary's URL-based transformations.
 * 
 * Features:
 * - Automatic WebP/AVIF format conversion (f_auto)
 * - Automatic quality compression (q_auto)
 * - Responsive sizes via srcSet
 * - Native lazy loading
 * - Low-quality image placeholder (blur-up effect)
 * - Error fallback
 */
export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  objectFit = 'cover',
  loading = 'lazy',
  priority = false, // If true, disables lazy loading and blur-up
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  onLoad,
  onError,
  fallbackSrc = '/placeholder.png', // Needs a local placeholder image
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Detect if the src is a Cloudinary URL
  const isCloudinary = src && src.includes('res.cloudinary.com');

  // Helper to generate a Cloudinary URL with specific width and optimization params
  const getOptimizedUrl = (originalUrl, targetWidth) => {
    if (!originalUrl || !isCloudinary) return originalUrl;
    
    // Check if URL already has transformations (e.g., /upload/c_fill,w_500/)
    const uploadIndex = originalUrl.indexOf('/upload/');
    if (uploadIndex === -1) return originalUrl;

    const baseUrl = originalUrl.substring(0, uploadIndex + 8);
    const restOfUrl = originalUrl.substring(uploadIndex + 8);
    
    // Extract existing transformations if any
    const parts = restOfUrl.split('/');
    let existingTransforms = '';
    let imagePath = restOfUrl;
    
    if (parts.length > 1 && parts[0].includes('_')) {
      // It looks like there are existing transformations
      existingTransforms = parts[0] + ',';
      imagePath = parts.slice(1).join('/');
    }

    // Default transformations: automatic format, automatic quality
    const transforms = `f_auto,q_auto${targetWidth ? `,w_${targetWidth}` : ''}`;
    
    return `${baseUrl}${existingTransforms}${transforms}/${imagePath}`;
  };

  // Generate responsive srcSet for Cloudinary images
  const generateSrcSet = () => {
    if (!isCloudinary || hasError) return undefined;
    const breakpoints = [320, 640, 768, 1024, 1280, 1536];
    return breakpoints
      .map((bp) => `${getOptimizedUrl(src, bp)} ${bp}w`)
      .join(', ');
  };

  // Generate a tiny blurred version for the placeholder
  const getBlurPlaceholder = () => {
    if (!isCloudinary || hasError) return undefined;
    const uploadIndex = src.indexOf('/upload/');
    if (uploadIndex === -1) return undefined;

    const baseUrl = src.substring(0, uploadIndex + 8);
    const restOfUrl = src.substring(uploadIndex + 8);
    
    const parts = restOfUrl.split('/');
    let imagePath = restOfUrl;
    if (parts.length > 1 && parts[0].includes('_')) {
      imagePath = parts.slice(1).join('/');
    }
    
    // q_10 (low quality), w_50 (tiny width), e_blur:500 (blur effect)
    return `${baseUrl}f_auto,q_10,w_50,e_blur:500/${imagePath}`;
  };

  // Final src to use
  const finalSrc = hasError ? fallbackSrc : (isCloudinary ? getOptimizedUrl(src, width) : src);
  const blurSrc = !priority && !isLoaded && isCloudinary && !hasError ? getBlurPlaceholder() : undefined;
  
  const isImageAutoHeight = className && (className.includes('h-auto') || className.includes('h-fit'));

  const finalObjectFit = (className && className.includes('object-contain')) 
    ? 'contain' 
    : (className && className.includes('object-fill')) 
      ? 'fill' 
      : objectFit;

  useEffect(() => {
    // Reset state if src changes
    setIsLoaded(priority);
    setHasError(false);

    // If the image is already complete (cached), set loaded state immediately
    const checkComplete = () => {
      if (imgRef.current && imgRef.current.complete) {
        setIsLoaded(true);
      }
    };

    checkComplete();
    const timer = setTimeout(checkComplete, 50);

    return () => clearTimeout(timer);
  }, [src, priority]);

  return (
    <div 
      className={`relative overflow-hidden bg-surface-variant flex items-center justify-center ${className || ""}`}
      style={{ 
        width: (width && typeof width === 'string') ? width : '100%', 
        height: isImageAutoHeight ? 'auto' : ((height && typeof height === 'string') ? height : '100%'),
      }}
    >
      {/* Blurred Placeholder */}
      {blurSrc && (
        <img
          src={blurSrc}
          alt={alt || "Loading placeholder"}
          className="absolute inset-0 w-full h-full object-cover scale-110 filter blur-lg transition-opacity duration-500 ease-out z-0"
          aria-hidden="true"
        />
      )}

      {/* Main Image */}
      <img
        ref={imgRef}
        src={finalSrc}
        srcSet={generateSrcSet()}
        sizes={isCloudinary ? sizes : undefined}
        alt={alt || "Image"}
        loading={priority ? 'eager' : loading}
        decoding={priority ? 'sync' : 'async'}
        width={width}
        height={height}
        className={`w-full ${isImageAutoHeight ? 'h-auto block' : 'h-full'} ${priority ? '' : 'transition-all duration-[800ms]'} z-10 relative ${
          isLoaded 
            ? "opacity-100 scale-100 filter-none" 
            : "opacity-0 scale-105 blur-md"
        } ${
          finalObjectFit === 'cover' ? 'object-cover' : 
          finalObjectFit === 'contain' ? 'object-contain' : 
          finalObjectFit === 'fill' ? 'object-fill' : 'object-none'
        }`}
        onLoad={(e) => {
          setIsLoaded(true);
          if (onLoad) onLoad(e);
        }}
        onError={(e) => {
          setHasError(true);
          setIsLoaded(true);
          if (onError) onError(e);
        }}
        {...props}
      />
    </div>
  );
}
