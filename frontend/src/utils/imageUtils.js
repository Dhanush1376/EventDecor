import cloudImageMappings from '../assets/cloud_image_mappings.json';
import { getApiRootUrl } from '../config/apiConfig';

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
 * Generate an optimized image URL with dynamic transformations.
 * Supports Cloudinary CDN parameters as well as backend /api/v1/media/optimize fallback.
 */
export const getOptimizedUrl = (url, width, height, quality = 'auto', format = 'auto') => {
  if (!url) return '';
  
  const isCloudinary = url.includes('cloudinary.com');
  
  if (isCloudinary) {
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;

    let transformations = `f_${format},q_${quality},dpr_auto`;
    if (width) transformations += `,w_${width}`;
    if (height) transformations += `,h_${height}`;
    if (width && height) transformations += ',c_fill';

    return `${parts[0]}/upload/${transformations}/${parts[1]}`;
  } else {
    // Local/static images route through backend dynamic media optimization pipeline
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
      // If it's already an external absolute URL that is not Cloudinary, return it directly
      if (!url.includes(window.location.hostname) && !url.includes('localhost') && !url.includes('127.0.0.1')) {
        return url;
      }
    }
    
    // Build local optimize endpoint URL
    let targetUrl = `${window.location.origin}/api/v1/media/optimize?url=${encodeURIComponent(url)}`;
    
    // In production (Vercel), we must route image optimization to the actual backend API
    // rather than the frontend origin, because there is no proxy in production.
    if (!import.meta.env.DEV) {
      const apiRoot = getApiRootUrl();
      targetUrl = `${apiRoot}/v1/media/optimize?url=${encodeURIComponent(url)}`;
    }
    
    if (width) targetUrl += `&w=${width}`;
    if (height) targetUrl += `&h=${height}`;
    if (quality && quality !== 'auto') targetUrl += `&q=${quality}`;
    if (format && format !== 'auto') targetUrl += `&fmt=${format}`;
    
    return targetUrl;
  }
};

/**
 * Generate a tiny, blurred placeholder for lazy loading
 */
export const getBlurredPlaceholder = (url) => {
  if (!url) return '';
  
  const isCloudinary = url.includes('cloudinary.com');
  if (isCloudinary) {
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;

    return `${parts[0]}/upload/f_auto,q_1,w_20,e_blur:1000/${parts[1]}`;
  } else {
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    // Fetch 20px blurred WebP from backend media pipeline
    let backendUrl = window.location.origin;
    if (!import.meta.env.DEV) {
      backendUrl = getApiRootUrl().replace(/\/api$/, '');
    }
    return `${backendUrl}/api/v1/media/optimize?url=${encodeURIComponent(url)}&w=20&q=20&fmt=webp`;
  }
};

/**
 * Generate a srcset for responsive images
 */
export const getSrcSet = (url, widths = [320, 640, 768, 1024, 1280, 1536], format = 'auto') => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return null;
  
  return widths
    .map(w => `${getOptimizedUrl(url, w, null, 'auto', format)} ${w}w`)
    .join(', ');
};

export const handleImageError = (e) => {
  if (e.target.dataset.errorHandled) return;
  e.target.dataset.errorHandled = "true";
  e.target.onerror = null;
  // Use a transparent pixel instead of the hardcoded SVG
  e.target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  e.target.classList.add("image-fallback-active");
};

