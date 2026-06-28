import ApiError from '../../utils/ApiError';
import User from '../../models/User';
import Product from '../../models/Product';

export class UserCartService {
  static async addToCart(
    userId: string,
    productId: string,
    quantity: number,
    type: string,
    rentalInfo: any,
  ) {
    const qty = Math.max(1, Math.min(50, Number(quantity) || 1));
    const product = await Product.findById(productId).select('stock isActive title');
    if (!product || !product.isActive) {
      throw new ApiError(404, 'Product is unavailable');
    }

    const itemType = type || 'purchase';

    const userHasItem = await User.findOne({
      _id: userId,
      'cart.product': productId,
      'cart.type': itemType,
    } as any);

    let updatedUser;
    if (userHasItem) {
      if (itemType === 'rental') {
        updatedUser = await User.findOneAndUpdate(
          { _id: userId, 'cart.product': productId, 'cart.type': itemType } as any,
          {
            $inc: { 'cart.$.quantity': qty },
            $set: { 'cart.$.rentalInfo': rentalInfo },
          },
          { returnDocument: 'after' },
        );
      } else {
        updatedUser = await User.findOneAndUpdate(
          { _id: userId, 'cart.product': productId, 'cart.type': itemType } as any,
          { $inc: { 'cart.$.quantity': qty } },
          { returnDocument: 'after' },
        );
      }
    } else if (qty > 0) {
      const currentUser = await User.findById(userId).select('cart');
      if (currentUser && currentUser.cart.length >= 50) {
        throw new ApiError(400, 'Cart capacity reached. Maximum 50 items allowed.');
      }
      updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        {
          $push: {
            cart: {
              product: productId,
              quantity: qty,
              variant: 'Default',
              type: itemType,
              rentalInfo,
            },
          },
        },
        { returnDocument: 'after' },
      );
    } else {
      updatedUser = await User.findById(userId);
    }

    if (!updatedUser) throw new ApiError(404, 'User not found');
    return updatedUser;
  }

  static async syncCart(userId: string, cartItems: any[]) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    const updatedCart = (cartItems || [])
      .filter((item: any) => item.product || item._id || item.id)
      .map((item: any) => ({
        product: item.product || item._id || item.id,
        quantity: Math.max(1, Math.min(50, Number(item.quantity) || 1)),
        variant: item.variant || 'Default',
        type: item.type || 'purchase',
        rentalInfo: item.rentalInfo,
      }));

    if (updatedCart.length > 50) {
      throw new ApiError(400, 'Cart capacity reached. Maximum 50 items allowed.');
    }

    await User.findOneAndUpdate({ _id: userId }, { $set: { cart: updatedCart } });
    return User.findById(userId);
  }

  static async removeFromCart(userId: string, productId: string) {
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $pull: { cart: { product: productId } } },
      { returnDocument: 'after' },
    );

    if (!user) throw new ApiError(404, 'User not found');
    return user;
  }
}
