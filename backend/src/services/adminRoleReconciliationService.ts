import User from '../models/User';
import { ADMIN_ROLES, getAdminEmails } from '../config/adminConfig';
import { isSameEmail } from '../utils/emailHelper';
import logger from '../config/logger';

const DEFAULT_STAFF_ROLE = 'admin';
const CUSTOMER_ROLES = ['user', 'customer'];

/**
 * Reconcile DB admin roles with ADMIN_EMAIL / configured admin list.
 * - Downgrades staff whose email is no longer in the configured list
 * - Upgrades configured emails that still have a customer role
 */
export class AdminRoleReconciliationService {
  static async reconcile() {
    const configuredEmails = getAdminEmails();
    if (configuredEmails.length === 0) {
      logger.warn('[ADMIN RECONCILE] No admin emails configured — skipping');
      return { upgraded: 0, downgraded: 0 };
    }

    let upgraded = 0;
    let downgraded = 0;

    const staffUsers = await User.find({ role: { $in: [...ADMIN_ROLES] } }).select('email role');
    for (const user of staffUsers) {
      const stillAuthorized = configuredEmails.some((addr) => isSameEmail(user.email, addr));
      if (!stillAuthorized) {
        user.role = 'user';
        await user.save();
        downgraded++;
        logger.info(`[ADMIN RECONCILE] Downgraded ${user.email} — no longer in admin email list`);
      }
    }

    const allUsers = await User.find().select('email role');
    for (const configured of configuredEmails) {
      const match = allUsers.find((u) => isSameEmail(u.email, configured));
      if (match && CUSTOMER_ROLES.includes(match.role)) {
        match.role = DEFAULT_STAFF_ROLE;
        await match.save();
        upgraded++;
        logger.info(`[ADMIN RECONCILE] Upgraded ${match.email} to ${DEFAULT_STAFF_ROLE}`);
      }
    }

    return { upgraded, downgraded };
  }
}
