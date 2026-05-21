import cloudImageMappings from '../assets/cloud_image_mappings.json';

/**
 * Resolve a legacy local public path (e.g. /mandala_hero_art.png) to its Cloudinary URL.
 * Falls back to the original path when no mapping exists (dev without CDN upload).
 */
export const resolveStaticAssetUrl = (localPath) => {
  if (!localPath) return localPath;
  if (localPath.includes('cloudinary.com')) return localPath;
  const key = localPath.startsWith('/') ? localPath : `/${localPath}`;
  return cloudImageMappings[key] || localPath;
};

/**
 * Generate an optimized Cloudinary URL with dynamic transformations
 * Supports AVIF/WebP, automatic quality, and responsive resizing
 */
export const getOptimizedUrl = (url, width, height, quality = 'auto') => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  let transformations = `f_auto,q_${quality},dpr_auto`;
  if (width) transformations += `,w_${width}`;
  if (height) transformations += `,h_${height}`;
  if (width && height) transformations += ',c_fill';

  return `${parts[0]}/upload/${transformations}/${parts[1]}`;
};

/**
 * Generate a tiny, blurred placeholder for lazy loading
 */
export const getBlurredPlaceholder = (url) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  return `${parts[0]}/upload/f_auto,q_1,w_20,e_blur:1000/${parts[1]}`;
};

/**
 * Generate a srcset for responsive images
 */
export const getSrcSet = (url, widths = [320, 640, 768, 1024, 1280, 1536]) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  return widths
    .map(w => `${getOptimizedUrl(url, w)} ${w}w`)
    .join(', ');
};

export const handleImageError = (e) => {
  if (e.target.dataset.errorHandled) return;
  e.target.dataset.errorHandled = "true";
  e.target.onerror = null;
  // Fallback inline SVG placeholder matching the Digital Studio theme
  e.target.src =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23faf9f6"/><path d="M150 100 L250 100 L250 200 L150 200 Z" fill="none" stroke="%23d4af37" stroke-width="1" opacity="0.3"/><text x="50%" y="50%" font-family="Playfair Display, serif" font-size="12" fill="%23735c00" text-anchor="middle" letter-spacing="2">DIGITAL STUDIO</text><text x="50%" y="62%" font-family="Inter, sans-serif" font-size="8" fill="%237f7663" text-anchor="middle" opacity="0.6" letter-spacing="1">COLLECTION IMAGE</text></svg>';
  e.target.classList.add("image-fallback-active");
};
