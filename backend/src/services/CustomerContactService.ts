import User from '../models/User';
import ApiError from '../utils/ApiError';
import { PhoneValidator } from '../validators/phoneValidator';

export class CustomerContactService {
  /**
   * Resolves the canonical contact phone for a user.
   * Checks User profile primarily.
   */
  static async resolveContact(userId: string): Promise<{ phone: string; isNew: boolean }> {
    const user = await User.findById(userId).select('phone').lean();
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const phone = user.phone;
    return {
      phone: phone || '',
      isNew: !phone,
    };
  }

  /**
   * Ensures a user has a valid phone number. Throws an error if they don't.
   * Useful as a strict gate before processing a transaction.
   */
  static async ensureContact(userId: string): Promise<string> {
    const { phone } = await this.resolveContact(userId);

    if (!phone) {
      throw new ApiError(
        428,
        'CUSTOMER_CONTACT_REQUIRED: A valid mobile number is required to proceed.',
      );
    }

    if (!PhoneValidator.validateIndianPhone(phone)) {
      throw new ApiError(400, 'Invalid phone number format stored in profile.');
    }

    return PhoneValidator.normalizePhone(phone).e164;
  }

  /**
   * Updates the user's canonical phone number.
   * Normalizes the input before saving.
   */
  static async updatePhone(userId: string, rawPhone: string): Promise<void> {
    if (!rawPhone || !PhoneValidator.validateIndianPhone(rawPhone)) {
      throw new ApiError(400, 'Invalid phone number provided.');
    }

    const normalized = PhoneValidator.normalizePhone(rawPhone).e164;

    // Check if another user already has this phone number to prevent duplicates
    const existingUser = await User.findOne({ phone: normalized, _id: { $ne: userId } });
    if (existingUser) {
      throw new ApiError(409, 'This phone number is already registered to another account.');
    }

    await User.findByIdAndUpdate(userId, { phone: normalized });
  }
}
