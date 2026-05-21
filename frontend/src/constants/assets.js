/**
 * Heavy static textures served from CDN (not bundled in Vite).
 * Override with VITE_MARBLE_TEXTURE_URL in production.
 */
export const MARBLE_TEXTURE_URL =
  import.meta.env.VITE_MARBLE_TEXTURE_URL ||
  'https://res.cloudinary.com/drxgnnzeb/image/upload/q_auto,f_webp,w_1920/v1/event_decor_ecommerce/assets/event_decor_marble-texture';
