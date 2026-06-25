import Product from '../models/Product';
import User from '../models/User';
import Coupon from '../models/Coupon';
import ApiError from '../utils/ApiError';
import storeSettingsService from '../services/StoreSettingsService';

export class OrderValidationService {
  static async validateTotals(userId: string, data: any) {
    const { items, couponCode } = data;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, 'Items array is required');
    }

    const settings = await storeSettingsService.getSettings();

    const MAX_QUANTITY_PER_ITEM = settings.orders.maxQuantityPerItem;
    const MAX_ITEMS_PER_ORDER = settings.orders.maxItemsPerOrder;

    if (items.length > MAX_ITEMS_PER_ORDER) {
      throw new ApiError(400, 'Too many items in order');
    }

    for (const item of items) {
      if (
        typeof item.quantity !== 'number' ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > MAX_QUANTITY_PER_ITEM
      ) {
        throw new ApiError(400, `Invalid quantity for item: ${item.productId}`);
      }
    }

    let subtotal = 0;
    const productIds = [
      ...new Set(items.map((item: any) => String(item.productId)).filter(Boolean)),
    ] as any[];
    const products = await Product.find({ _id: { $in: productIds } }).select(
      'title price stock category isActive rentalEnabled rentalPricing securityDeposit isDepositRefundable',
    );
    const productsById = new Map<string, any>(
      products.map((product: any) => [product._id.toString(), product]),
    );

    let depositTotal = 0;

    // 1. Validate stock availability and calculate actual subtotal from DB
    for (const item of items) {
      const product = productsById.get(String(item.productId));
      if (!product) throw new ApiError(404, `Product not found: ${item.productId}`);
      if (!product.isActive)
        throw new ApiError(400, `Product is no longer active: ${product.title}`);
      const availableStock = product.stock - (product.reservedStock || 0);
      if (availableStock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for product: ${product.title}`);
      }

      let itemPrice = product.price;

      if (item.type === 'rental') {
        if (!product.rentalEnabled)
          throw new ApiError(400, `Product is not available for rent: ${product.title}`);

        // Calculate rental price based on days
        if (item.rentalInfo?.startDate && item.rentalInfo?.endDate) {
          const days =
            Math.ceil(
              (new Date(item.rentalInfo.endDate).getTime() -
                new Date(item.rentalInfo.startDate).getTime()) /
                (1000 * 3600 * 24),
            ) + 1;

          if (days <= 1 && product.rentalPricing?.daily) itemPrice = product.rentalPricing.daily;
          else if (days <= 7 && product.rentalPricing?.weekly)
            itemPrice = product.rentalPricing.weekly;
          else if (product.rentalPricing?.monthly) itemPrice = product.rentalPricing.monthly;
        }

        // Add security deposit
        if (product.securityDeposit) {
          depositTotal += product.securityDeposit * item.quantity;
        }
      }

      subtotal += itemPrice * item.quantity;
    }

    // Fetch user details first (for tier validation and wallet checking)
    let availableWallet = 0;
    let loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' = 'Bronze';
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        availableWallet = user.walletBalance || 0;
        loyaltyTier = user.loyaltyTier || 'Bronze';
      }
    }

    // 2. Validate Coupon Validity on DB
    let discount = 0;
    let couponValid = false;
    let couponMessage = '';
    let cashbackPercentage = 0;
    let cashbackFixed = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (!coupon) {
        couponMessage = 'Invalid coupon code';
      } else if (new Date() > coupon.expiryDate) {
        couponMessage = 'Coupon has expired';
      } else if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        couponMessage = 'Coupon usage limit has been reached';
      } else if (subtotal < coupon.minOrderAmount) {
        couponMessage = `Minimum order amount of ₹${coupon.minOrderAmount} is required`;
      } else {
        // Customer Eligibility checks
        if (
          coupon.targetType === 'tiers' &&
          coupon.targetUserTiers &&
          coupon.targetUserTiers.length > 0
        ) {
          if (!coupon.targetUserTiers.includes(loyaltyTier)) {
            couponMessage = `This coupon is exclusively reserved for loyalty levels: ${coupon.targetUserTiers.join(', ')}`;
          }
        }

        if (!couponMessage) {
          // Dynamic Product/Category targeting checks
          let applicableAmount = 0;
          if (
            coupon.targetType === 'products' &&
            coupon.targetProductIds &&
            coupon.targetProductIds.length > 0
          ) {
            const productIdsStr = coupon.targetProductIds.map((id: any) => id.toString());
            for (const item of items) {
              if (productIdsStr.includes(item.productId.toString())) {
                const product = productsById.get(String(item.productId));
                if (product) {
                  applicableAmount += product.price * item.quantity;
                }
              }
            }
            if (applicableAmount === 0) {
              couponMessage = 'This coupon code is only valid for selected premium products.';
            }
          } else if (
            coupon.targetType === 'categories' &&
            coupon.targetCategories &&
            coupon.targetCategories.length > 0
          ) {
            const targetCatsLower = coupon.targetCategories.map((c: any) => c.toLowerCase());
            for (const item of items) {
              const product = productsById.get(String(item.productId));
              if (product && targetCatsLower.includes(product.category.toLowerCase())) {
                applicableAmount += product.price * item.quantity;
              }
            }
            if (applicableAmount === 0) {
              couponMessage = `This coupon is only valid for categories: ${coupon.targetCategories.join(', ')}`;
            }
          } else {
            applicableAmount = subtotal;
          }

          if (!couponMessage) {
            couponValid = true;
            if (coupon.discountType === 'percentage') {
              discount = (applicableAmount * coupon.discountValue) / 100;
              if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
              }
            } else {
              discount = Math.min(applicableAmount, coupon.discountValue);
            }
            discount = Math.round(discount);
            cashbackPercentage = coupon.cashbackPercentage || 0;
            cashbackFixed = coupon.cashbackFixed || 0;
            couponMessage = `Coupon applied! ₹${discount} discount saved.`;
          }
        }
      }
    }

    const { paymentMethod, useWallet } = data;
    const shippingFee =
      subtotal > settings.shipping.freeShippingThreshold || subtotal === 0
        ? 0
        : settings.shipping.deliveryCharge;
    const platformFee = settings.orders.platformFee;

    let codFee = 0;
    if (paymentMethod && paymentMethod.toLowerCase() === 'cod') {
      codFee = settings.payments.codFee;
    }

    const preliminaryTotal = Math.max(0, subtotal + shippingFee + codFee - discount);

    let walletDeduction = 0;
    if (useWallet) {
      walletDeduction = Math.min(preliminaryTotal, availableWallet);
    }

    const total = preliminaryTotal - walletDeduction + depositTotal;

    // Estimate Siri Coins
    const coinsToEarn = Math.round(subtotal * settings.loyalty.coinsPerRupee);

    // Estimate Cashback percentage based on membership tier
    let cashbackRate = 0;
    const tierConfig = settings.loyalty.tiers.find((t) => t.name === loyaltyTier);
    if (tierConfig) {
      cashbackRate = tierConfig.cashbackRate;
    } else if (settings.loyalty.tiers.length > 0) {
      cashbackRate = settings.loyalty.tiers[0].cashbackRate; // Default to first tier if not found
    }

    let estimatedCashback = Math.round(total * cashbackRate);

    // Dynamic Coupon Cashback Integration
    if (couponValid) {
      if (cashbackPercentage > 0) {
        estimatedCashback += Math.round((subtotal * cashbackPercentage) / 100);
      }
      if (cashbackFixed > 0) {
        estimatedCashback += cashbackFixed;
      }
    }

    return {
      subtotal,
      discount,
      shippingFee,
      platformFee,
      codFee,
      walletBalance: availableWallet,
      walletDeduction,
      coinsEarned: coinsToEarn,
      cashbackEarned: estimatedCashback,
      total,
      depositTotal,
      couponValid,
      couponMessage,
    };
  }
}
