export const ADMIN_ROLES = [
  'super_admin',
  'main_admin',
  'moderator',
  'support_admin',
  'order_manager',
  'content_manager',
  'admin',
  'manager',
  'coordinator',
];

export const isAdminRole = (role) => ADMIN_ROLES.includes(role);
