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

      if (width) transforms.push(`c_limit,w_${width}`);
      if (height) transforms.push(`h_${height}`);

      const transformStr = transforms.join(',');

      let path = parts[1];
      let segments = path.split('/');

      // Strip any existing transform segments. A transform segment typically contains an underscore
      // and does NOT start with a 'v' followed by only digits (which is a version tag).
      while (
        segments.length > 1 &&
        (segments[0].includes('_') || segments[0].includes(',')) &&
        !/^v\d+$/.test(segments[0])
      ) {
        segments = segments.slice(1);
      }
      path = segments.join('/');

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

const blurCache = new Map();

/**
 * Generates an ultra-lightweight inline SVG for image placeholders
 * Eliminates the need for an initial Cloudinary network request
 */
export const getBlurDataUri = (width = 400, height = 300) => {
  const cacheKey = `${width}x${height}`;
  if (blurCache.has(cacheKey)) {
    return blurCache.get(cacheKey);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f3f4f6" />
        <stop offset="50%" stop-color="#e5e7eb" />
        <stop offset="100%" stop-color="#f3f4f6" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)" />
  </svg>`;

  const uri = `data:image/svg+xml;base64,${btoa(svg)}`;

  if (blurCache.size < 50) {
    blurCache.set(cacheKey, uri);
  }

  return uri;
};

/**
 * Returns the closest responsive width from standard breakpoints
 */
export const getResponsiveWidth = (targetWidth) => {
  const breakpoints = [240, 400, 640, 800, 1024, 1280, 1536];
  if (!targetWidth) return null;

  // Find the smallest breakpoint that is >= targetWidth
  const width = breakpoints.find((bp) => bp >= targetWidth);
  return width || breakpoints[breakpoints.length - 1]; // Fallback to max if larger
};

/**
 * Generate a srcset for responsive images, capping at max requested width to save bandwidth
 */
export const getSrcSet = (url, maxWidth = null, format = 'auto') => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return null;

  let validWidths = [];

  if (maxWidth && maxWidth <= 200) {
    // For thumbnails, only generate 1x and 2x
    validWidths = [maxWidth, maxWidth * 2];
  } else if (maxWidth && maxWidth <= 600) {
    validWidths = [320, 640, maxWidth * 2].filter((w) => w <= maxWidth * 2);
  } else {
    const breakpoints = [320, 640, 1024, 1536];
    validWidths = maxWidth ? breakpoints.filter((w) => w <= maxWidth * 1.5) : breakpoints;
  }

  // Deduplicate and sort
  validWidths = [...new Set(validWidths)].sort((a, b) => a - b);

  // Always ensure at least one fallback width
  if (validWidths.length === 0 && maxWidth) {
    validWidths.push(getResponsiveWidth(maxWidth));
  }

  return validWidths
    .map((w) => `${getOptimizedUrl(url, w, null, 'auto', format)} ${w}w`)
    .join(', ');
};

/**
 * Single function to return all responsive image props (src, srcSet, sizes)
 */
export const getResponsiveImageProps = (
  url,
  width,
  height,
  sizes = '100vw',
  format = 'auto',
  quality = 'auto',
) => {
  if (!url) return { src: '', srcSet: undefined, sizes: undefined };

  const optimizedSrc = getOptimizedUrl(url, width, height, quality, format);
  const srcSet = getSrcSet(url, width, format);

  return {
    src: optimizedSrc,
    srcSet: srcSet || undefined,
    sizes: srcSet ? sizes : undefined,
  };
};

const SVG_FALLBACK = getBlurDataUri(400, 300);

export const handleImageError = (e) => {
  if (e.target.dataset.errorHandled === 'true') {
    e.target.onerror = null;
    return;
  }

  e.target.dataset.errorHandled = 'true';
  e.target.onerror = null;
  e.target.src = SVG_FALLBACK;
  e.target.classList.add('image-fallback-active');
};
