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

const urlCache = new Map();

/**
 * Generate an optimized image URL with dynamic transformations.
 * Supports Cloudinary CDN parameters as well as backend /api/v1/media/optimize fallback.
 */
export const getOptimizedUrl = (url, width, height, quality = 'auto', format = 'auto') => {
  if (!url) return '';

  const cacheKey = `${url}|${width}|${height}|${quality}|${format}`;
  if (urlCache.has(cacheKey)) {
    return urlCache.get(cacheKey);
  }

  const isCloudinary = url.includes('cloudinary.com');
  let resultUrl = url;

  if (isCloudinary) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      let transforms = [];
      if (format && format !== 'auto') transforms.push(`f_${format}`);
      else transforms.push('f_auto');

      if (quality && quality !== 'auto') transforms.push(`q_${quality}`);
      else transforms.push('q_auto');

      if (width) transforms.push(`w_${width}`);
      if (height) transforms.push(`h_${height}`);

      const transformStr = transforms.join(',');

      let path = parts[1];
      if (path.includes('/') && !path.startsWith('v')) {
        const firstSegment = path.split('/')[0];
        if (firstSegment.includes('_') || firstSegment.includes(',')) {
          path = path.substring(path.indexOf('/') + 1);
        }
      }

      resultUrl = `${parts[0]}/upload/${transformStr}/${path}`;
    }
  } else {
    // Local/static images route through backend dynamic media optimization pipeline
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      let targetUrl = `${window.location.origin}/api/v1/media/optimize?url=${encodeURIComponent(url)}`;

      if (!import.meta.env.DEV) {
        const apiRoot = getApiRootUrl();
        targetUrl = `${apiRoot}/v1/media/optimize?url=${encodeURIComponent(url)}`;
      }

      if (width) targetUrl += `&w=${width}`;
      if (height) targetUrl += `&h=${height}`;
      if (quality && quality !== 'auto') targetUrl += `&q=${quality}`;
      if (format && format !== 'auto') targetUrl += `&fmt=${format}`;

      resultUrl = targetUrl;
    }
  }

  urlCache.set(cacheKey, resultUrl);
  // Prevent memory leaks by bounding the cache
  if (urlCache.size > 1000) {
    const firstKey = urlCache.keys().next().value;
    urlCache.delete(firstKey);
  }

  return resultUrl;
};

/**
 * Generate a tiny, blurred placeholder for lazy loading
 */
export const getBlurredPlaceholder = (url) => {
  if (!url) return '';

  const isCloudinary = url.includes('cloudinary.com');
  if (isCloudinary) {
    const parts = url.split('/upload/');
    if (parts.length !== 2) return null;

    let path = parts[1];
    if (path.includes('/') && !path.startsWith('v')) {
      const firstSegment = path.split('/')[0];
      if (firstSegment.includes('_') || firstSegment.includes(',')) {
        path = path.substring(path.indexOf('/') + 1);
      }
    }

    return `${parts[0]}/upload/e_blur:1000,q_1,f_webp/${path}`;
  } else {
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
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
export const getSrcSet = (url, widths = [320, 640, 1024, 1536], format = 'auto') => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return null;

  return widths.map((w) => `${getOptimizedUrl(url, w, null, 'auto', format)} ${w}w`).join(', ');
};

const SVG_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="%23f3f4f6"><rect width="100%25" height="100%25" fill="%23f3f4f6" /><path d="M150 150 L200 100 L250 150 Z" fill="%23d1d5db" /><circle cx="200" cy="180" r="20" fill="%23d1d5db" /></svg>';

export const handleImageError = (e) => {
  if (e.target.dataset.errorHandled === 'true') {
    // Second failure (fallback also failed), hide it completely
    e.target.onerror = null;
    e.target.src = SVG_FALLBACK;
    e.target.classList.add('image-fallback-active');
    return;
  }

  e.target.dataset.errorHandled = 'true';

  const src = e.target.src || '';
  if (src.includes('cloudinary.com') && src.includes('/upload/')) {
    const parts = src.split('/upload/');
    const afterUpload = parts[1];
    if (afterUpload) {
      const segments = afterUpload.split('/');
      if (segments.length > 1 && (segments[0].includes(',') || segments[0].includes('_'))) {
        if (!/^v\d+$/.test(segments[0])) {
          const originalPath = segments.slice(1).join('/');
          e.target.src = `${parts[0]}/upload/${originalPath}`;
          return;
        }
      }
    }
  }

  e.target.onerror = null;
  e.target.src = SVG_FALLBACK;
  e.target.classList.add('image-fallback-active');
};
