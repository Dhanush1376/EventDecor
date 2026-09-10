import ApiError from '../../utils/ApiError';
import Address from '../../models/Address';

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
