import ApiError from '../../utils/ApiError';
import User from '../../models/User';
import Product from '../../models/Product';
import mongoose from 'mongoose';

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

    const objectId = new mongoose.Types.ObjectId(productId);

    const userHasItem = await User.findOne({
      _id: userId,
      'cart.product': objectId,
      'cart.type': itemType,
    } as any);

    let updatedUser;
    if (userHasItem) {
      if (itemType === 'rental') {
        const updateOps: any = {
          $inc: { 'cart.$.quantity': qty },
        };
        if (rentalInfo) {
          updateOps.$set = { 'cart.$.rentalInfo': rentalInfo };
        }
        updatedUser = await User.findOneAndUpdate(
          { _id: userId, 'cart.product': objectId, 'cart.type': itemType } as any,
          updateOps,
          { new: true },
        );
      } else {
        updatedUser = await User.findOneAndUpdate(
          { _id: userId, 'cart.product': objectId, 'cart.type': itemType } as any,
          { $inc: { 'cart.$.quantity': qty } },
          { new: true },
        );
      }
    } else if (qty > 0) {
      const currentUser = await User.findById(userId).select('cart');
      if (currentUser && currentUser.cart.length >= 50) {
        throw new ApiError(400, 'Cart capacity reached. Maximum 50 items allowed.');
      }
      const cartItem: any = {
        product: objectId,
        quantity: qty,
        variant: 'Default',
        type: itemType,
      };
      if (rentalInfo) {
        cartItem.rentalInfo = rentalInfo;
      }
      updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        {
          $push: {
            cart: cartItem,
          },
        },
        { new: true },
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
      { $pull: { cart: { product: new mongoose.Types.ObjectId(productId) } } },
      { new: true },
    );

    if (!user) throw new ApiError(404, 'User not found');
    return user;
  }

  static async mergeCart(userId: string, guestItems: any[]) {
    const user = await User.findById(userId).populate({
      path: 'cart.product',
      select:
        'title isActive stock price imageSrc category rentalPricing securityDeposit isNonRefundable',
    });

    if (!user) throw new ApiError(404, 'User not found');

    const existingCart = user.cart || [];
    const droppedItems: any[] = [];
    const mergedCart = [...existingCart.map((i: any) => i.toObject())];

    for (const item of guestItems || []) {
      const productId = item.product || item._id || item.id;
      if (!productId) continue;

      const product = await Product.findById(productId).select('isActive stock rentalStock title');
      const itemType = item.type || 'purchase';
      const isOutOfStock =
        itemType === 'rental'
          ? (Number(product?.rentalStock) || 0) <= 0 && (Number(product?.stock) || 0) <= 0
          : (Number(product?.stock) || 0) <= 0;

      if (!product || !product.isActive || isOutOfStock) {
        droppedItems.push({ productId, reason: 'Unavailable or Out of Stock' });
        continue;
      }
      const variant = item.variant || 'Default';
      const rentalInfoKey =
        itemType === 'rental' && item.rentalInfo
          ? `${item.rentalInfo.startDate}_${item.rentalInfo.endDate}`
          : 'none';

      const existingIndex = mergedCart.findIndex((i: any) => {
        const iProductId = i.product?._id?.toString() || i.product?.toString();
        const sameProduct = iProductId === productId.toString();
        const sameType = i.type === itemType;
        const sameVariant = (i.variant || 'Default') === variant;
        const sameRental =
          itemType === 'purchase' ||
          (i.rentalInfo ? `${i.rentalInfo.startDate}_${i.rentalInfo.endDate}` : 'none') ===
            rentalInfoKey;

        return sameProduct && sameType && sameVariant && sameRental;
      });

      const qtyToAdd = Math.max(1, Number(item.quantity) || 1);

      if (existingIndex >= 0) {
        mergedCart[existingIndex].quantity = Math.min(
          50,
          mergedCart[existingIndex].quantity + qtyToAdd,
        );
      } else {
        if (mergedCart.length >= 50) {
          droppedItems.push({ productId, reason: 'Cart capacity reached (max 50)' });
          continue;
        }
        mergedCart.push({
          product: productId,
          quantity: Math.min(50, qtyToAdd),
          type: itemType,
          variant,
          rentalInfo: item.rentalInfo,
          deposit: item.deposit || 0,
        });
      }
    }

    // Save
    user.cart = mergedCart;
    await user.save();

    const updatedUser = await User.findById(userId).populate({
      path: 'cart.product',
      select:
        'title isActive stock price oldPrice imageSrc category rentalPricing securityDeposit isNonRefundable seller rating customizationConfig',
    });

    return { cart: updatedUser?.cart || [], droppedItems };
  }
}
