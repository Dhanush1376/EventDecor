import ApiError from '../../utils/ApiError';
import Address from '../../models/Address';
import User from '../../models/User';
import { invalidateUserSessionCaches } from '../../utils/cache/userSessionCache';

async function syncProfileNameFromAddress(userId: string, name?: string) {
  if (!name || typeof name !== 'string') return;
  const trimmed = name.trim();
  if (!trimmed || trimmed.toLowerCase() === 'customer') return;

  const user = await User.findById(userId);
  if (user && (!user.name || user.name === 'Customer' || user.name.trim() === '')) {
    user.name = trimmed;
    await user.save();
    await invalidateUserSessionCaches(String(userId));
  }
}

export class UserAddressService {
  static async getAddresses(userId: string) {
    return Address.find({ user: userId }).lean();
  }

  static async addAddress(userId: string, emailFallback: string | undefined, data: any) {
    const existingAddressesCount = await Address.countDocuments({ user: userId });

    const email = data.email || emailFallback;
    const country = data.country || 'India';

    const shouldBeDefault = Boolean(data.isDefault) || existingAddressesCount === 0;
    if (shouldBeDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
    }

    await Address.create({
      ...data,
      email,
      country,
      user: userId,
      isDefault: shouldBeDefault,
    });

    await syncProfileNameFromAddress(userId, data.name);

    return Address.find({ user: userId });
  }

  static async updateAddress(
    userId: string,
    addressId: string,
    emailFallback: string | undefined,
    data: any,
  ) {
    const updateData = { ...data };
    if (updateData.email === undefined && emailFallback) {
      updateData.email = emailFallback;
    }
    if (updateData.country === undefined) {
      updateData.country = 'India';
    }
    if (updateData.isDefault) {
      await Address.updateMany({ user: userId, _id: { $ne: addressId } }, { isDefault: false });
    }

    const address = await Address.findOneAndUpdate({ _id: addressId, user: userId }, updateData, {
      returnDocument: 'after',
    });

    if (!address) throw new ApiError(404, 'Address not found');

    await syncProfileNameFromAddress(userId, data.name);

    return Address.find({ user: userId });
  }

  static async deleteAddress(userId: string, addressId: string) {
    await Address.findOneAndDelete({ _id: addressId, user: userId });
    return Address.find({ user: userId });
  }

  static async setDefaultAddress(userId: string, addressId: string) {
    await Address.updateMany({ user: userId }, { isDefault: false });

    const address = await Address.findOneAndUpdate(
      { _id: addressId, user: userId },
      { isDefault: true },
      { returnDocument: 'after' },
    );

    if (!address) throw new ApiError(404, 'Address not found');

    return Address.find({ user: userId });
  }
}
