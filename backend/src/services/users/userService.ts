import User from '../../models/User';
import Product from '../../models/Product';
import TeamInvite from '../../models/TeamInvite';
import ApiError from '../../utils/ApiError';
import { STAFF_ROLES, canActorAssignRole } from '../../config/adminConfig';
import { canonicalizeEmail } from '../../utils/email/emailHelper';
import crypto from 'crypto';
import { sendDirectEmail } from '../notificationService';
import { getFrontendUrl } from '../../utils/getFrontendUrl';
import { getTeamInviteEmailTemplate } from '../../utils/email/emailTemplates';
import storeSettingsService from '../StoreSettingsService';

export class UserService {
  static async updateUserRole(targetUserId: string, newRole: string, actorRole: string) {
    if (newRole !== 'user' && newRole !== 'customer' && !STAFF_ROLES.includes(newRole as any)) {
      throw new ApiError(400, 'Invalid role assignment requested');
    }

    if (!canActorAssignRole(actorRole, newRole)) {
      throw new ApiError(
        403,
        `Access denied. Your current role (${actorRole}) does not have sufficient clearance to assign the '${newRole}' role.`,
      );
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) throw new ApiError(404, 'User not found');

    const targetRole = targetUser.role;
    if (
      targetRole === 'owner' ||
      (!canActorAssignRole(actorRole, targetRole) && actorRole !== 'owner')
    ) {
      throw new ApiError(
        403,
        'Access denied. You cannot modify the role of a user with equal or higher privileges.',
      );
    }

    const user = await User.findByIdAndUpdate(targetUserId, { role: newRole }, { new: true });
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  }

  static async computeAndValidateCart(user: any) {
    const requestId = crypto.randomBytes(4).toString('hex');
    const hashedUserId = user
      ? crypto
          .createHash('sha256')
          .update(String(user._id || user.id || 'unknown'))
          .digest('hex')
          .slice(0, 12)
      : 'null';
    const hashId = (id: any) =>
      id ? crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 12) : 'null';

    const validatedCart = [];
    let cartChanged = false;
    let rejectedItemCount = 0;
    const rejectionReasons: Record<string, string> = {};
    const rejectedProductHashes: string[] = [];
    const includedProductHashes: string[] = [];

    const rawCart = Array.isArray(user.cart) ? user.cart : [];

    for (const item of rawCart) {
      const ts = Date.now();
      const rawProductValue =
        typeof item.product === 'object' && item.product !== null
          ? {
              typeof: 'object',
              constructorName: item.product.constructor?.name,
              isObjectId: !!item.product._bsontype,
              has_id: !!item.product._id,
              has__id: !!item.product.__id,
            }
          : item.product;

      console.log(`[CART_COMPUTE_TRACE][RAW_ITEM]`, {
        requestId,
        hashedUserId,
        productHash: hashId(item.product),
        rawProductValue,
        hasProductId: !!item.product,
        cartType: item.type,
        quantity: item.quantity,
        hasVariant: !!item.variant,
        hasRentalInfo: !!item.rentalInfo,
        timestamp: ts,
      });

      console.log(`[CART_COMPUTE_TRACE][PRODUCT_ID_NORMALIZATION]`, {
        productHash: hashId(item.product),
        rawProductType: typeof item.product,
        rawConstructor: item.product?.constructor?.name,
        normalizedProductIdHash: hashId(String(item.product)),
        normalizationStrategy: 'String(item.product)',
        normalizationSucceeded:
          String(item.product) !== '[object Object]' && String(item.product) !== 'undefined',
      });
    }

    const productIds = Array.from(
      new Set<string>(rawCart.map((item: any) => String(item.product)).filter(Boolean)),
    );

    console.log(`[CART_COMPUTE_TRACE][PRODUCT_QUERY_INPUT]`, {
      requestedProductCount: productIds.length,
      requestedProductIdHashes: productIds.map(hashId),
    });

    const products = await Product.find({ _id: { $in: productIds } });

    console.log(`[CART_COMPUTE_TRACE][PRODUCT_QUERY_RESULT]`, {
      requestedProductCount: productIds.length,
      foundProductCount: products.length,
      requestedProductIdHashes: productIds.map(hashId),
      foundProductIdHashes: products.map((p: any) => hashId(p._id)),
    });

    for (const pid of productIds) {
      if (!products.find((p: any) => String(p._id) === pid)) {
        try {
          const mongoose = require('mongoose');
          const existsById = await Product.collection
            .findOne({ _id: new mongoose.Types.ObjectId(pid) })
            .then((doc: any) => !!doc)
            .catch(() => false);
          const existsWithProductionQuery = await Product.findOne({ _id: pid })
            .then((doc: any) => !!doc)
            .catch(() => false);
          console.log(`[CART_COMPUTE_TRACE][ENVIRONMENT_CHECK]`, {
            productHash: hashId(pid),
            databaseName: Product.db.name,
            collectionName: Product.collection.name,
            existsById,
            existsWithProductionQuery,
          });
        } catch (e) {
          // ignore parsing errors for non-objectids
        }
      }
    }

    const productsById = new Map(products.map((product: any) => [product._id.toString(), product]));

    const aggregatedCartMap = new Map<string, any>();

    for (const item of rawCart) {
      const pH = hashId(item.product);
      if (!item.product) {
        console.log(`[CART_COMPUTE_TRACE][ITEM_REJECTED]`, {
          productHash: pH,
          reason: '!item.product',
          timestamp: Date.now(),
        });
        rejectedItemCount++;
        rejectionReasons[pH] = '!item.product';
        rejectedProductHashes.push(pH);
        continue;
      }
      const product = productsById.get(String(item.product));
      if (!product || !product.isActive) {
        console.log(`[CART_COMPUTE_TRACE][ITEM_REJECTED]`, {
          productHash: pH,
          reason: '!product || !product.isActive',
          timestamp: Date.now(),
        });
        cartChanged = true;
        rejectedItemCount++;
        rejectionReasons[pH] = '!product || !product.isActive';
        rejectedProductHashes.push(pH);
        continue;
      }

      const itemType = item.type || 'purchase';
      const quantity = Number(item.quantity) || 0;

      if (quantity <= 0) {
        console.log(`[CART_COMPUTE_TRACE][ITEM_REJECTED]`, {
          productHash: pH,
          reason: 'quantity <= 0',
          timestamp: Date.now(),
        });
        cartChanged = true;
        rejectedItemCount++;
        rejectionReasons[pH] = 'quantity <= 0';
        rejectedProductHashes.push(pH);
        continue;
      }

      const key = `${item.product}_${itemType}_${item.variant || 'Default'}_${JSON.stringify(item.rentalInfo || {})}`;

      if (aggregatedCartMap.has(key)) {
        cartChanged = true;
        const existing = aggregatedCartMap.get(key);
        existing.quantity += quantity;
      } else {
        aggregatedCartMap.set(key, {
          product: product,
          quantity,
          variant: item.variant || 'Default',
          type: itemType,
          rentalInfo: item.rentalInfo,
        });
      }
    }

    for (const item of aggregatedCartMap.values()) {
      const pH = hashId(item.product._id);
      if (item.quantity > 50) {
        item.quantity = 50;
        cartChanged = true;
      }
      const availableStock =
        item.type === 'rental' ? (item.product.rentalStock ?? 10) : (item.product.stock ?? 10);
      if (item.quantity > availableStock) {
        item.quantity = availableStock;
        cartChanged = true;
      }

      if (item.quantity > 0) {
        validatedCart.push(item);
        includedProductHashes.push(pH);
      } else {
        console.log(`[CART_COMPUTE_TRACE][ITEM_REJECTED]`, {
          productHash: pH,
          reason: 'item.quantity <= 0 after stock adjustment',
          timestamp: Date.now(),
        });
        cartChanged = true;
        rejectedItemCount++;
        rejectionReasons[pH] = 'item.quantity <= 0 after stock adjustment';
        rejectedProductHashes.push(pH);
      }
    }

    if (cartChanged) {
      console.log(`[CART_COMPUTE_TRACE][DB_CART_CLEANUP_START]`, {
        beforeRawCount: rawCart.length,
      });
      user.cart = validatedCart.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        variant: item.variant,
        type: item.type,
        rentalInfo: item.rentalInfo,
      }));
      await User.findOneAndUpdate({ _id: user._id }, { $set: { cart: user.cart } });
      console.log(`[CART_COMPUTE_TRACE][DB_CART_CLEANUP_RESULT]`, {
        afterRawCount: user.cart.length,
        removedProductHashes: rejectedProductHashes,
      });
    }

    const settings = await storeSettingsService.getSettings();

    const computeSummary = (items: any[], isRental: boolean) => {
      let subtotal = 0;
      let depositTotal = 0;

      items.forEach((item) => {
        let itemPrice = item.product.price;

        if (isRental && item.rentalInfo?.startDate && item.rentalInfo?.endDate) {
          const start = new Date(item.rentalInfo.startDate);
          const end = new Date(item.rentalInfo.endDate);
          const diffDays =
            Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;

          if (item.product.rentalPricing) {
            if (diffDays >= 30 && item.product.rentalPricing.monthly > 0) {
              itemPrice = (item.product.rentalPricing.monthly / 30) * diffDays;
            } else if (diffDays >= 7 && item.product.rentalPricing.weekly > 0) {
              itemPrice = (item.product.rentalPricing.weekly / 7) * diffDays;
            } else if (item.product.rentalPricing.daily > 0) {
              itemPrice = item.product.rentalPricing.daily * diffDays;
            }
          }
          depositTotal += (item.product.securityDeposit || 0) * item.quantity;
        }

        subtotal += itemPrice * item.quantity;
      });

      const shippingFee =
        subtotal > settings.shipping.freeShippingThreshold || subtotal === 0
          ? 0
          : settings.shipping.deliveryCharge;
      const platformFee = settings.orders.platformFee;
      const discount = 0;
      const total = subtotal + shippingFee + depositTotal - discount;

      return {
        subtotal,
        depositTotal,
        shippingFee,
        platformFee,
        discount,
        total,
      };
    };

    const purchaseItems = validatedCart.filter((item) => item.type === 'purchase');
    const rentalItems = validatedCart.filter((item) => item.type === 'rental');

    console.log(`[CART_COMPUTE_TRACE][COMPUTE_RESULT]`, {
      rawItemCount: rawCart.length,
      purchaseItemCount: purchaseItems.length,
      rentalItemCount: rentalItems.length,
      rejectedItemCount,
      rejectionReasons,
      includedProductHashes,
      rejectedProductHashes,
      timestamp: Date.now(),
    });

    return {
      purchaseCart: {
        items: purchaseItems,
        summary: computeSummary(purchaseItems, false),
      },
      rentalCart: {
        items: rentalItems,
        summary: computeSummary(rentalItems, true),
      },
    };
  }

  static async inviteTeamMember(
    email: string,
    role: string,
    permissions: string,
    inviterId: string,
  ) {
    const cleanEmail = canonicalizeEmail(email);

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser && ['admin', 'manager', 'coordinator'].includes(existingUser.role as any)) {
      throw new ApiError(400, 'This user is already a registered team member');
    }

    await TeamInvite.deleteMany({ email: cleanEmail, status: 'pending' }, {
      bypassDestructionGuard: true,
    } as any);

    const token = crypto.randomBytes(32).toString('hex');
    const invite = await TeamInvite.create({
      email: cleanEmail,
      role: role as any,
      permissions: permissions || 'Full Access',
      token,
      invitedBy: inviterId,
    });

    const frontendUrl = getFrontendUrl();
    const acceptUrl = `${frontendUrl}/accept-invite?token=${token}`;
    const emailHtml = getTeamInviteEmailTemplate(acceptUrl, role, permissions || 'Full Access');

    await sendDirectEmail({
      email: cleanEmail,
      subject: 'Invitation to join Siri Arts & Crafts Admin Team',
      customHtml: emailHtml,
      type: 'security',
      action: 'team_invite',
    });

    return invite;
  }

  static async trackRecentlyViewed(userId: string, productId: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    if (!user.recentlyViewed) user.recentlyViewed = [];

    user.recentlyViewed = user.recentlyViewed.filter(
      (item: any) => item.product.toString() !== productId,
    );

    user.recentlyViewed.unshift({ product: productId as any, viewedAt: new Date() });

    if (user.recentlyViewed.length > 20) {
      user.recentlyViewed = user.recentlyViewed.slice(0, 20);
    }

    await user.save();
    return user.recentlyViewed;
  }

  static async updatePreferences(
    userId: string,
    notificationPreferences: any,
    accountPreferences: any,
  ) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    if (notificationPreferences) {
      if (!user.notificationPreferences) user.notificationPreferences = {} as any;
      if (typeof notificationPreferences.email === 'boolean') {
        user.notificationPreferences!.email = notificationPreferences.email;
      }
      if (
        notificationPreferences.categories &&
        typeof notificationPreferences.categories.promotions === 'boolean'
      ) {
        if (!user.notificationPreferences!.categories)
          user.notificationPreferences!.categories = {} as any;
        user.notificationPreferences!.categories!.promotions =
          notificationPreferences.categories.promotions;
      }
      user.markModified('notificationPreferences');
    }

    if (accountPreferences) {
      if (!user.accountPreferences) user.accountPreferences = {} as any;
      if (accountPreferences.theme) {
        user.accountPreferences!.theme = accountPreferences.theme;
      }
      if (accountPreferences.language) {
        user.accountPreferences!.language = accountPreferences.language;
      }
      user.markModified('accountPreferences');
    }

    await user.save();
    return {
      notificationPreferences: user.notificationPreferences,
      accountPreferences: user.accountPreferences,
    };
  }

  static async uploadAvatar(userId: string, file: any) {
    const { MediaService } = require('../media/MediaService');

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    user.avatar = file.path || file.secure_url;
    await user.save();

    if (user.avatar) {
      await MediaService.syncReferences('User', user._id, [user.avatar], 'avatar');
    } else {
      await MediaService.syncReferences('User', user._id, [], 'avatar');
    }

    return user.avatar;
  }
  static async updateProfile(userId: string, updateData: Record<string, any>) {
    if (updateData.email) {
      const cleanEmail = canonicalizeEmail(updateData.email);
      const existingUser = await User.findOne({ email: cleanEmail, _id: { $ne: userId } });
      if (existingUser) {
        throw new ApiError(400, 'An account with this email address already exists');
      }
    }

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    // Fields that should never be updated via mass assignment
    const protectedFields = [
      '_id',
      'id',
      'role',
      'passwordHash',
      'twoFactorSecret',
      'walletBalance',
      'siriCoins',
      'loyaltyTier',
      'isVerified',
      'googleId',
      'providers',
      'createdAt',
      'updatedAt',
      'cart',
      'wishlist',
      'recentlyViewed',
      'avatar', // Handled via dedicated uploadAvatar endpoint
    ];

    Object.keys(updateData).forEach((key) => {
      if (!protectedFields.includes(key) && updateData[key] !== undefined) {
        if (key === 'email') {
          user.email = canonicalizeEmail(updateData[key]);
        } else {
          (user as any)[key] = updateData[key];
        }
      }
    });

    await user.save();
    return user;
  }
}
