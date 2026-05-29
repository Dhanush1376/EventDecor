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
  'owner',
  'super_admin',
  'main_admin',
  'admin'
] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

/**
 * All staff/admin roles (superset of ADMIN_ROLES).
 * Use this for any check that should include moderators, managers, etc.
 * Single source of truth — do NOT hardcode role arrays elsewhere.
 */
export const STAFF_ROLES = [
  'owner',
  'super_admin',
  'main_admin',
  'admin',
  'moderator',
  'support_admin',
  'support',
  'order_manager',
  'content_manager',
  'manager',
  'coordinator',
] as const;
export type StaffRole = typeof STAFF_ROLES[number];

/**
 * Role weight hierarchy mapping for security access checks (higher = more privileged).
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  owner: 100,
  super_admin: 90,
  main_admin: 85,
  admin: 80,
  moderator: 70,
  support_admin: 60,
  support: 50,
  order_manager: 40,
  content_manager: 30,
  manager: 20,
  coordinator: 10,
  customer: 0,
  user: 0
};

/**
 * Checks if an actor can perform administrative tasks on a target user based on role weights.
 * - Only owner and super_admin can manage other users.
 * - Owners can manage anyone (except another owner, handled separately for protection).
 * - Super admins can only manage roles strictly lower than super_admin (weight < 90).
 */
export const canActorManageTarget = (actorRole: string, targetRole: string): boolean => {
  const actorWeight = ROLE_HIERARCHY[actorRole] ?? 0;
  const targetWeight = ROLE_HIERARCHY[targetRole] ?? 0;

  if (actorWeight < 90) return false;
  if (actorRole === 'owner') return true;

  return actorWeight > targetWeight;
};

/**
 * Checks if an actor is authorized to assign/invite a user to a specific role.
 * - Actor must be owner or super_admin.
 * - Super admins cannot assign owner or super_admin roles.
 */
export const canActorAssignRole = (actorRole: string, roleToAssign: string): boolean => {
  const actorWeight = ROLE_HIERARCHY[actorRole] ?? 0;
  const targetWeight = ROLE_HIERARCHY[roleToAssign] ?? 0;

  if (actorWeight < 90) return false;
  if (actorRole === 'owner') return true;

  return targetWeight < 90;
};

