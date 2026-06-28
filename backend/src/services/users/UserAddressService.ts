import ApiError from '../../utils/ApiError';
import Address from '../../models/Address';

export class UserAddressService {
  static async getAddresses(userId: string) {
    return Address.find({ user: userId }).lean();
  }

  static async addAddress(userId: string, emailFallback: string, data: any) {
    const existingAddressesCount = await Address.countDocuments({ user: userId });

    const email = data.email || emailFallback;
    const country = data.country || 'India';

    await Address.create({
      ...data,
      email,
      country,
      user: userId,
      isDefault: existingAddressesCount === 0,
    });

    return Address.find({ user: userId });
  }

  static async updateAddress(userId: string, addressId: string, emailFallback: string, data: any) {
    const updateData = { ...data };
    if (updateData.email === undefined && emailFallback) {
      updateData.email = emailFallback;
    }
    if (updateData.country === undefined) {
      updateData.country = 'India';
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
