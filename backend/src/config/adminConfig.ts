/**
 * Shared Admin Configuration Constants
 * Centralizes admin email resolution to eliminate hardcoded values scattered across middleware and services.
 */

const HARDCODED_ADMIN_EMAIL = 'admin@siriartsandcrafts.com';
const SUPER_ADMIN_EMAIL = 'sirisha.atmakuri@gmail.com';

/**
 * Returns the canonical list of admin email addresses from environment + hardcoded fallback.
 * Used by authMiddleware, authService, and authController for admin identification.
 */
export const getAdminEmails = (): string[] => {
  return [
    HARDCODED_ADMIN_EMAIL,
    SUPER_ADMIN_EMAIL,
    (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
    'dhanush1376@gmail.com',
  ].filter(Boolean);
};

/**
 * Roles that are allowed access to admin resources.
 */
export const ADMIN_ROLES = [
  'super_admin',
  'main_admin',
  'moderator',
  'support_admin',
  'order_manager',
  'content_manager',
  'admin',
  'manager',
  'coordinator'
] as const;
export type AdminRole = typeof ADMIN_ROLES[number];
