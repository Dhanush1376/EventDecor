import cloudImageMappings from '../../assets/cloud_image_mappings.json';

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

export const MEDIA_PRESETS = {
  THUMBNAIL: { w: 150, q: 'auto:eco', c: 'fill' },
  PRODUCT_CARD: { w: 400, q: 'auto:good', c: 'limit' },
  PRODUCT_DETAIL_MOBILE: { w: 600, q: 'auto:good', c: 'limit' },
  PRODUCT_DETAIL_DESKTOP: { w: 1200, q: 'auto:good', c: 'limit' },
  PRODUCT_GALLERY_PREVIEW: { w: 250, q: 'auto:eco', c: 'fill' },
  PRODUCT_ZOOM: { w: 2000, q: 'auto:best', c: 'limit' },
  CART_THUMBNAIL: { w: 100, q: 'auto:eco', c: 'fill' },
  ORDER_THUMBNAIL: { w: 100, q: 'auto:eco', c: 'fill' },
  ADMIN_TABLE_THUMBNAIL: { w: 80, q: 'auto:eco', c: 'fill' },
  CATEGORY_CARD: { w: 600, q: 'auto:good', c: 'limit' },
  EVENT_GALLERY_PREVIEW: { w: 400, q: 'auto:good', c: 'limit' },
  CUSTOM_ORDER_PREVIEW: { w: 400, q: 'auto:good', c: 'limit' },
};

const urlCache = new Map();

/**
 * Generate an optimized image URL with dynamic transformations.
 * Supports Cloudinary CDN parameters as well as backend /api/v1/media/optimize fallback.
 */
export const getOptimizedUrl = (url, widthOrPreset, height, quality = 'auto', format = 'auto') => {
  if (!url) return '';

  // Fix for old cloudinary cloud name
  if (url.includes('dwy7sz5eh')) {
    url = url.replace('dwy7sz5eh', 'drxgnnzeb');
  }

  let w = widthOrPreset;
  let h = height;
  let q = quality;
  let f = format;
  let cropMode = 'limit';

  if (typeof widthOrPreset === 'string' && MEDIA_PRESETS[widthOrPreset]) {
    const preset = MEDIA_PRESETS[widthOrPreset];
    w = preset.w;
    h = preset.h || null;
    q = preset.q || 'auto';
    cropMode = preset.c || 'limit';
  }

  const cacheKey = `${url}|${w}|${h}|${q}|${f}`;
  if (urlCache.has(cacheKey)) {
    return urlCache.get(cacheKey);
  }

  const isCloudinary = url.includes('cloudinary.com');
  let resultUrl = url;

  if (isCloudinary) {
    // HIGH-PRIORITY FIX: Support for 'original' quality to serve the uncompressed, unscaled raw image
    if (q === 'original') {
      const urlParts = url.split('/upload/');
      if (urlParts.length === 2) {
        let pathPart = urlParts[1];
        const pathSegments = pathPart.split('/');
        let cleanPathSegments = [];
        let foundVersionOrFile = false;
        for (const segment of pathSegments) {
          if (foundVersionOrFile) {
            cleanPathSegments.push(segment);
          } else if (segment.match(/^v\d+$/) || !segment.includes('_') || segment.includes('.')) {
            foundVersionOrFile = true;
            cleanPathSegments.push(segment);
          }
        }
        pathPart = cleanPathSegments.join('/');
        const rawUrl = `${urlParts[0]}/upload/${pathPart}`;
        urlCache.set(cacheKey, rawUrl);
        return rawUrl;
      }
    }

    // HIGH-PRIORITY FIX: If auto:best is requested, we strip old constraints but forcefully apply an ultra-HD transform
    if (q === 'auto:best') {
      const urlParts = url.split('/upload/');
      if (urlParts.length === 2) {
        let pathPart = urlParts[1];
        const pathSegments = pathPart.split('/');
        let cleanPathSegments = [];
        let foundVersionOrFile = false;
        for (const segment of pathSegments) {
          if (foundVersionOrFile) {
            cleanPathSegments.push(segment);
          } else if (segment.match(/^v\d+$/) || !segment.includes('_') || segment.includes('.')) {
            foundVersionOrFile = true;
            cleanPathSegments.push(segment);
          }
        }
        pathPart = cleanPathSegments.join('/');

        // Force 1600px width, auto upscale, best quality, and auto format
        const hdTransform = 'w_1600,c_scale,q_auto:best,f_auto,e_upscale,e_improve';
        const rawUrl = `${urlParts[0]}/upload/${hdTransform}/${pathPart}`;
        urlCache.set(cacheKey, rawUrl);
        return rawUrl;
      }
    }

    let transform = [];

    // Normalize to nearest breakpoint to maximize cache hits
    const normalizedWidth = w ? getResponsiveWidth(w) : null;
    const normalizedHeight = h ? getResponsiveWidth(h) : null;

    if (normalizedWidth) transform.push(`w_${normalizedWidth},c_${cropMode}`);
    if (normalizedHeight) transform.push(`h_${normalizedHeight},c_${cropMode}`);

    // Size-aware quality tiers
    const effectiveQuality =
      normalizedWidth && normalizedWidth <= 400 ? 'q_auto:eco' : 'q_auto:good';

    if (q && q !== 'auto') transform.push(`q_${q}`);
    else transform.push(effectiveQuality);

    if (f && f !== 'auto') transform.push(`f_${f}`);
    else transform.push('f_auto');

    transform.push('fl_strip_profile');
    transform.push('fl_immutable_cache');
    transform.push('fl_progressive');

    const transformStr = transform.join(',');

    const urlParts = url.split('/upload/');
    if (urlParts.length === 2) {
      let pathPart = urlParts[1];
      // Strip all existing transformation segments until we hit the version string (v+digits) or the filename
      const pathSegments = pathPart.split('/');
      let cleanPathSegments = [];
      let foundVersionOrFile = false;
      for (const segment of pathSegments) {
        if (foundVersionOrFile) {
          cleanPathSegments.push(segment);
        } else if (segment.match(/^v\d+$/) || !segment.includes('_') || segment.includes('.')) {
          // If it looks like a version string (v12345), or has no underscores (folders without transforms), or has a dot (filename)
          foundVersionOrFile = true;
          cleanPathSegments.push(segment);
        }
      }
      pathPart = cleanPathSegments.join('/');

      const transformStrFinal = transformStr;

      resultUrl = `${urlParts[0]}/upload/${transformStrFinal}/${pathPart}`;
    } else {
      resultUrl = url;
    }

    // Removed backend proxy for Cloudinary URLs in DEV to prevent bandwidth leaks and masked CDN issues.
  } else {
    // Local/static images should be served directly by the frontend CDN (Vercel/Vite)
    // We strictly avoid proxying them through the backend Node.js server.
    const isAbsoluteExternal = url.startsWith('http://') || url.startsWith('https://');

    if (!url.startsWith('data:') && !url.startsWith('blob:') && !isAbsoluteExternal) {
      resultUrl = url; // Serve static asset directly
    } else if (isAbsoluteExternal) {
      if (url.includes('googleusercontent.com') && !url.includes('=')) {
        let flags = [];
        if (w) flags.push(`w${w}`);
        if (h) flags.push(`h${h}`);
        flags.push('rw'); // request webp format
        resultUrl = `${url}=${flags.join('-')}`;
      } else {
        resultUrl = url; // External trusted images (not proxied through backend)
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
  const breakpoints = [240, 320, 400, 500, 640, 800, 1024, 1280, 1536, 1920];

  if (effectiveMaxWidth && effectiveMaxWidth <= 200) {
    validWidths = breakpoints.filter((w) => w <= 400); // Up to 2x
    derivedQuality = 'auto:low';
  } else if (effectiveMaxWidth && effectiveMaxWidth <= 360) {
    validWidths = breakpoints.filter((w) => w <= 800); // Up to ~2x+
    derivedQuality = 'auto:good';
  } else if (effectiveMaxWidth && effectiveMaxWidth <= 600) {
    validWidths = breakpoints.filter((w) => w <= 1280); // Up to ~2x
    derivedQuality = 'auto:good';
  } else {
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
  e.target.removeAttribute('srcset');
  e.target.removeAttribute('sizes');
  e.target.classList.add('image-fallback-active');
};
