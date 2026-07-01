import cloudImageMappings from '../../assets/cloud_image_mappings.json';
import { getApiRootUrl } from '../../config/apiConfig';

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
 * Returns the closest responsive width from standard breakpoints
 */
export const getResponsiveWidth = (targetWidth) => {
  const breakpoints = [240, 400, 640, 800, 1024, 1280, 1536];
  if (!targetWidth) return null;

  // Find the smallest breakpoint that is >= targetWidth
  const width = breakpoints.find((bp) => bp >= targetWidth);
  return width || breakpoints[breakpoints.length - 1]; // Fallback to max if larger
};

const urlCache = new Map();

/**
 * Generate an optimized image URL with dynamic transformations.
 * Supports Cloudinary CDN parameters as well as backend /api/v1/media/optimize fallback.
 */
export const getOptimizedUrl = (url, width, height, quality = 'auto', format = 'auto') => {
  if (!url) return '';

  // Fix for old cloudinary cloud name
  if (url.includes('dwy7sz5eh')) {
    url = url.replace('dwy7sz5eh', 'drxgnnzeb');
  }

  const cacheKey = `${url}|${width}|${height}|${quality}|${format}`;
  if (urlCache.has(cacheKey)) {
    return urlCache.get(cacheKey);
  }

  const isCloudinary = url.includes('cloudinary.com');
  let resultUrl = url;

  if (isCloudinary) {
    let transform = [];

    // Normalize to nearest breakpoint to maximize cache hits
    const normalizedWidth = width ? getResponsiveWidth(width) : null;
    const normalizedHeight = height ? getResponsiveWidth(height) : null;

    if (normalizedWidth) transform.push(`w_${normalizedWidth},c_limit`);
    if (normalizedHeight) transform.push(`h_${normalizedHeight},c_limit`);

    // Size-aware quality tiers
    const effectiveQuality =
      normalizedWidth && normalizedWidth <= 400 ? 'q_auto:eco' : 'q_auto:good';

    if (quality && quality !== 'auto') transform.push(`q_${quality}`);
    else transform.push(effectiveQuality);

    if (format && format !== 'auto') transform.push(`f_${format}`);
    else transform.push('f_auto');

    transform.push('dpr_auto');
    transform.push('fl_strip_profile');
    transform.push('fl_immutable_cache');
    transform.push('fl_progressive');

    const transformStr = transform.join(',');

    const urlParts = url.split('/upload/');
    if (urlParts.length === 2) {
      let pathPart = urlParts[1];
      const firstSlash = pathPart.indexOf('/');
      if (firstSlash > 0) {
        const potentialTransforms = pathPart.substring(0, firstSlash);
        if (potentialTransforms.includes('_') && !potentialTransforms.startsWith('v')) {
          pathPart = pathPart.substring(firstSlash + 1);
        }
      }

      // We removed the hardcoded c_fill,h_750 here because it aggressively crops and zooms
      // hero images and tall banners on large desktop breakpoints, breaking visual immutability.
      const transformStrFinal = transformStr;

      resultUrl = `${urlParts[0]}/upload/${transformStrFinal}/${pathPart}`;
    } else {
      resultUrl = url;
    }
  } else {
    // Local/static images route through backend dynamic media optimization pipeline
    const isAbsoluteExternal = url.startsWith('http://') || url.startsWith('https://');

    if (!url.startsWith('data:') && !url.startsWith('blob:') && !isAbsoluteExternal) {
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
    } else if (isAbsoluteExternal) {
      if (url.includes('googleusercontent.com') && !url.includes('=')) {
        let flags = [];
        if (width) flags.push(`w${width}`);
        if (height) flags.push(`h${height}`);
        flags.push('rw'); // request webp format
        resultUrl = `${url}=${flags.join('-')}`;
      } else {
        resultUrl = url;
      }
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
 * Generate a srcset for responsive images, capping at max requested width to save bandwidth
 */
export const getSrcSet = (url, maxWidth = null, quality = 'auto', format = 'auto') => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return null;

  const isAbsoluteExternal = url.startsWith('http://') || url.startsWith('https://');
  const isCloudinary = url.includes('cloudinary.com');
  if (isAbsoluteExternal && !isCloudinary) return null; // Can't dynamically resize external non-Cloudinary without transforms

  let validWidths;

  // Bandwidth protection: Hard cap maximum requested width
  const effectiveMaxWidth = maxWidth && maxWidth > 1536 ? 1536 : maxWidth;

  let derivedQuality = 'auto:good';
  if (effectiveMaxWidth && effectiveMaxWidth <= 200) {
    validWidths = [effectiveMaxWidth, effectiveMaxWidth * 2];
    derivedQuality = 'auto:low';
  } else if (effectiveMaxWidth && effectiveMaxWidth <= 320) {
    validWidths = [320, 480];
    derivedQuality = 'auto:good';
  } else if (effectiveMaxWidth && effectiveMaxWidth <= 360) {
    validWidths = [360, 480];
    derivedQuality = 'auto:good';
  } else if (effectiveMaxWidth && effectiveMaxWidth <= 600) {
    // Tighter cap for eco tier - target 480px max retina
    const maxRetina = 480;
    validWidths = [240, 320, 360, 400, 480, 500].filter((w) => w <= maxRetina);
    derivedQuality = 'auto:eco';
  } else {
    const breakpoints = [240, 320, 400, 500, 640, 800, 1024, 1280, 1536];
    validWidths = effectiveMaxWidth
      ? breakpoints.filter((w) => w <= effectiveMaxWidth * 2) // Cap at retina width
      : breakpoints;
    derivedQuality = 'auto:good';
  }

  // Deduplicate and sort
  validWidths = [...new Set(validWidths)].sort((a, b) => a - b);

  // Always ensure at least one fallback width
  if (validWidths.length === 0 && effectiveMaxWidth) {
    validWidths.push(getResponsiveWidth(effectiveMaxWidth));
  }

  return validWidths
    .map((w) => {
      const qualityParam = quality === 'auto' ? derivedQuality : quality;
      return `${getOptimizedUrl(url, w, null, qualityParam, format)} ${w}w`;
    })
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
  const srcSet = getSrcSet(url, width, quality, format);

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
