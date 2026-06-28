import ApiError from '../../utils/ApiError';
import User from '../../models/User';
import Product from '../../models/Product';
import {
  cacheWishlist,
  getCachedSessionJson,
  sessionKeys,
} from '../../utils/cache/userSessionCache';

export class UserWishlistService {
  static async getWishlist(userId: string) {
    const cacheKey = sessionKeys.wishlist(userId);
    const cached = await getCachedSessionJson<unknown[]>(cacheKey);
    if (cached) {
      return { data: cached, cacheStatus: 'HIT' };
    }

    const user = await User.findById(userId).select('wishlist');
    if (!user) throw new ApiError(404, 'User not found');

    const wishlistArray = user.wishlist || [];

    const [products, showcases] = await Promise.all([
      Product.find({ _id: { $in: wishlistArray } })
        .select(
          'name title price rentalPrice imageSrc images category isAvailable quantity availableQuantity slug',
        )
        .lean(),
      require('../../models/ShowcaseCollection')
        .default.find({ _id: { $in: wishlistArray } })
        .select(
          'title subtitle category rentalPrice description image gallery inclusions colorPalette setupTimeHours popularityScore isActive',
        )
        .lean(),
    ]);

    const combinedWishlist = [
      ...products.map((p: any) => ({ ...p, itemType: 'product' })),
      ...showcases.map((s: any) => ({ ...s, itemType: 'event' })),
    ];

    await cacheWishlist(userId, combinedWishlist);
    return { data: combinedWishlist, cacheStatus: 'MISS' };
  }

  static async toggleWishlist(userId: string, productId: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    const index = user.wishlist.findIndex((id: any) => id.toString() === productId);
    let action = 'Added to wishlist';

    if (index === -1) {
      if (user.wishlist.length >= 100) {
        throw new ApiError(400, 'Wishlist capacity reached. Maximum 100 items allowed.');
      }
      user.wishlist.push(productId as any);
    } else {
      user.wishlist.splice(index, 1);
      action = 'Removed from wishlist';
    }

    await user.save();

    return { action, wishlist: user.wishlist };
  }
}
