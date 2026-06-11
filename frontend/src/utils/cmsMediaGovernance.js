/**
 * CMS Media Governance Utility
 *
 * Centralizes rules for image uploads from the admin panel to ensure
 * storefront performance isn't degraded by unoptimized content.
 */

// Maximum file size (2 MB)
export const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024;

export const MEDIA_DIMENSION_LIMITS = {
  hero: { maxWidth: 4096, maxHeight: 2160 }, // 4K max
  product: { maxWidth: 2048, maxHeight: 2048 }, // 2K max
  thumbnail: { maxWidth: 800, maxHeight: 800 },
  mandala: { maxWidth: 800, maxHeight: 800 }, // Mandalas don't need to be huge
};

/**
 * Validates a file before upload
 * @param {File} file The file to check
 * @returns {Object} { valid: boolean, error?: string }
 */
export const validateUpload = (file) => {
  if (!file) return { valid: false, error: 'No file provided' };

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 2MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB). Please compress the image before uploading to maintain storefront performance.`,
    };
  }

  return { valid: true };
};

/**
 * Ensures an uploaded Cloudinary URL contains auto-optimization flags.
 * If the URL doesn't have f_auto or q_auto, they are injected.
 *
 * @param {string} url The raw Cloudinary URL
 * @returns {string} The optimized Cloudinary URL
 */
export const enforceCloudinaryOptimizations = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
    return url;
  }

  // If it already has transformations (e.g. /upload/v1234/ or /upload/w_500/v1234/)
  const uploadMatch = url.match(/\/upload\/(.*?\/)?(v\d+\/)/);

  if (uploadMatch) {
    const existingTransforms = uploadMatch[1] || '';
    const version = uploadMatch[2];

    // Check if auto optimizations exist
    const hasFormat = existingTransforms.includes('f_');
    const hasQuality = existingTransforms.includes('q_');
    const hasStripProfile = existingTransforms.includes('fl_strip_profile');
    const hasDprAuto = existingTransforms.includes('dpr_auto');
    const hasLimit = existingTransforms.includes('c_limit');

    let newTransforms = existingTransforms;
    if (newTransforms.endsWith('/')) {
      newTransforms = newTransforms.slice(0, -1);
    }

    const additions = [];
    if (!hasFormat) additions.push('f_auto');
    if (!hasQuality) additions.push('q_auto');
    if (!hasStripProfile) additions.push('fl_strip_profile');
    if (!hasDprAuto) additions.push('dpr_auto');
    if (!hasLimit) additions.push('c_limit,w_2048,h_2048'); // Enforce max 2k resolution delivery limit for uploaded assets

    if (newTransforms.length > 0) {
      newTransforms += ',' + additions.join(',');
    } else {
      newTransforms = additions.join(',');
    }

    return url.replace(uploadMatch[0], `/upload/${newTransforms}/${version}`);
  }

  return url;
};
