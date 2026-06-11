/**
 * Brand/site values from Vite env only (no hardcoded production URLs).
 */
export const SITE_URL = import.meta.env.VITE_SITE_URL || '';
export const SITE_NAME = import.meta.env.VITE_SITE_NAME || '';
export const OG_IMAGE_URL =
  import.meta.env.VITE_OG_IMAGE_URL || (SITE_URL ? `${SITE_URL}/og-image.webp` : '');
export const CONTACT_PHONE = import.meta.env.VITE_CONTACT_PHONE || '';
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';

export const SOCIAL_INSTAGRAM = import.meta.env.VITE_SOCIAL_INSTAGRAM || '';
export const SOCIAL_PINTEREST = import.meta.env.VITE_SOCIAL_PINTEREST || '';
export const SOCIAL_FACEBOOK = import.meta.env.VITE_SOCIAL_FACEBOOK || '';
export const TWITTER_HANDLE = import.meta.env.VITE_TWITTER_HANDLE || '';

/** Merge CMS footer social links with env fallbacks (env only when CMS empty). */
export const buildSameAsLinks = (footerSocialLinks = {}) => {
  const links = [
    footerSocialLinks.instagram || SOCIAL_INSTAGRAM,
    footerSocialLinks.pinterest || SOCIAL_PINTEREST,
    footerSocialLinks.facebook || SOCIAL_FACEBOOK,
  ].filter(Boolean);
  return links;
};
