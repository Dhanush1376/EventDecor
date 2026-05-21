/**
 * Shared Admin Configuration Constants
 * Centralizes admin email resolution — production uses env vars only (no hardcoded addresses).
 */

/**
 * Primary super-admin account (role changes / removal blocked). Set SUPER_ADMIN_EMAIL in production.
 */
export const getSuperAdminEmail = (): string | undefined => {
  const email = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  return email || undefined;
};

/**
 * Returns the canonical list of admin email addresses from environment.
 * Used by authMiddleware, authService, and authController for admin identification.
 */
export const getAdminEmails = (): string[] => {
  const emails = [
    (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
    (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase(),
  ];
  return emails.filter(Boolean);
};

/** True when the email is the configured protected super-admin account. */
export const isProtectedSuperAdminEmail = (email: string): boolean => {
  const protectedEmail = getSuperAdminEmail();
  if (!protectedEmail) return false;
  return email.trim().toLowerCase() === protectedEmail;
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
