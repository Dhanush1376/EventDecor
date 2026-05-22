/**
 * Marble texture from Cloudinary CDN (never bundled in /public).
 * Production builds must set VITE_MARBLE_TEXTURE_URL.
 */
const CLOUDINARY_MARBLE_DEV_FALLBACK =
  'https://res.cloudinary.com/drxgnnzeb/image/upload/q_auto,f_webp,w_1920/v1/event_decor_ecommerce/assets/event_decor_marble-texture';

export const MARBLE_TEXTURE_URL = (() => {
  const configured = import.meta.env.VITE_MARBLE_TEXTURE_URL?.trim();
  if (configured) return configured;
  if (import.meta.env.DEV) return CLOUDINARY_MARBLE_DEV_FALLBACK;
  throw new Error(
    'VITE_MARBLE_TEXTURE_URL is not set. Configure it in your deployment environment.'
  );
})();
