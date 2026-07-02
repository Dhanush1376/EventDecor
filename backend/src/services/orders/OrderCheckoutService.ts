import crypto from 'crypto';
import mongoose from 'mongoose';
import { RazorpayGateway } from '../../utils/payment/RazorpayGateway';
import Order from '../../models/Order';
import Product from '../../models/Product';
import User from '../../models/User';
import Coupon from '../../models/Coupon';
import ApiError from '../../utils/ApiError';
import logger from '../../config/logger';
import storeSettingsService from '../../services/StoreSettingsService';
import WalletTransaction from '../../models/WalletTransaction';
import { debitWalletBalance } from '../../utils/payment/walletMutations';
import PaymentAttempt from '../../models/PaymentAttempt';
import { LogisticsService } from '../../services/logisticsService';
import { OrderIdempotencyManager } from './OrderIdempotencyManager';
import OutboxEvent from '../../models/OutboxEvent';
import { InventoryService } from '../InventoryService';
import { getFrontendUrl } from '../../utils/getFrontendUrl';

export class OrderCheckoutService {
  static async createOrder(userId: string, orderData: any) {
    const {
      items,
      shippingAddress,
      couponCode,
      notes,
      needByDate,
      paymentMethod,
      useWallet,
      idempotencyKey,
      isCustomOrder,
      customOrderId,
    } = orderData;
    const isCod = paymentMethod === 'cod';

    const settings = await storeSettingsService.getSettings();

    const MAX_QUANTITY_PER_ITEM = settings.orders.maxQuantityPerItem;
    const MAX_ITEMS_PER_ORDER = settings.orders.maxItemsPerOrder;

    if (!items || !Array.isArray(items)) {
      throw new ApiError(400, 'Items array is required');
    }

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

    // STRICT IDEMPOTENCY
    await OrderIdempotencyManager.acquireLock(userId, idempotencyKey);
    const cachedResponse = await OrderIdempotencyManager.getCachedResponse(userId, idempotencyKey);
    if (cachedResponse) {
      await OrderIdempotencyManager.releaseLock(userId, idempotencyKey);
      return cachedResponse;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    let subtotal = 0;
    const depositTotal = 0;
    const orderItems = [];
    const reservationIds = [];
    const pendingOrderId = new mongoose.Types.ObjectId();

    try {
      if (isCustomOrder && customOrderId) {
        // --- CUSTOM ORDER PATH ---
        const CustomOrder = require('../../models/CustomOrder').default;
        const customOrderObj = await CustomOrder.findById(customOrderId).session(session);
        if (!customOrderObj || customOrderObj.status !== 'Approved') {
          throw new ApiError(400, 'Invalid or unapproved custom order');
        }

        subtotal = customOrderObj.quotation.total || 0;

        // Push a single mock item into orderItems using a dummy product ID to satisfy schema
        orderItems.push({
          productId: new mongoose.Types.ObjectId(), // Dummy ID just to satisfy schema ref
          title: `Custom Design: ${customOrderObj.occasion || customOrderObj.productType || 'Decor'}`,
          price: subtotal,
          quantity: 1,
          variant: 'Custom',
          imageSrc:
            customOrderObj.inspirationImages?.[0] ||
            'https://res.cloudinary.com/dwy422pzt/image/upload/v1727787498/Siri_Logo_c5a17k.jpg',
          category: 'CustomOrder',
          isNonRefundable: true,
          type: 'purchase',
          deposit: 0,
        });
      } else {
        // --- STANDARD E-COMMERCE PATH ---
        const productIds = [
          ...new Set(items.map((item: any) => String(item.productId)).filter(Boolean)),
        ] as any[];
        const products = await Product.find({ _id: { $in: productIds } })
          .select('title price stock reservedStock isActive imageSrc category isNonRefundable')
          .session(session);
        const productsById = new Map<string, any>(products.map((p: any) => [p._id.toString(), p]));

        for (const item of items) {
          if (item.type === 'rental') {
            throw new ApiError(
              400,
              `Rental items cannot be purchased through the standard checkout. Please use the dedicated Rental Wizard for ${item.title || 'this item'}.`,
            );
          }
          const product = productsById.get(String(item.productId));
          if (!product) throw new ApiError(404, `Product ${item.productId} not found`);
          if (!product.isActive)
            throw new ApiError(400, `Product is no longer active: ${product.title}`);
          const availableStock = product.stock - (product.reservedStock || 0);
          if (availableStock < item.quantity) {
            throw new ApiError(400, `Insufficient stock for product: ${product.title}`);
          }
        }

        for (const item of items) {
          const product = productsById.get(String(item.productId))!;

          // Use InventoryService for TTL-based reservations (ATOMIC $inc)
          const reservation = await InventoryService.reserveInventory(
            item.productId,
            item.quantity,
            userId,
            15,
            session,
          );
          reservationIds.push(reservation._id);

          const itemPrice = product.price;
          const itemType = item.type || 'purchase';
          const itemTotal = itemPrice * item.quantity;
          subtotal += itemTotal;

          orderItems.push({
            productId: product._id,
            title: product.title,
            price: itemPrice,
            quantity: item.quantity,
            variant: item.variant || 'Default',
            imageSrc: product.imageSrc,
            category: product.category,
            isNonRefundable: product.isNonRefundable || false,
            type: itemType,
            deposit: 0,
            customizationNote: item.customizationNote,
          });
        }
      }

      let walletDeducted = false;
      let walletDeduction = 0;
      let order: any;

      let discount = 0;
      let couponValid = false;

      // Only VALIDATE the coupon here, DO NOT increment usedCount yet (unless COD)
      let couponDoc: any = null;
      if (couponCode) {
        couponDoc = await Coupon.findOne({
          code: couponCode.toUpperCase(),
          isActive: true,
          $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
        }).session(session);

        if (
          couponDoc &&
          new Date() <= couponDoc.expiryDate &&
          subtotal >= couponDoc.minOrderAmount
        ) {
          couponValid = true;
          if (couponDoc.discountType === 'percentage') {
            discount = (subtotal * couponDoc.discountValue) / 100;
            if (couponDoc.maxDiscount && discount > couponDoc.maxDiscount) {
              discount = couponDoc.maxDiscount;
            }
          } else {
            discount = couponDoc.discountValue;
          }
          discount = Math.round(discount);
        } else {
          throw new ApiError(400, 'Coupon is invalid, expired, or usage limit reached');
        }
      }

      let codFee = 0;
      if (isCod) {
        codFee = settings.payments.codFee;
      }

      const shippingFee =
        subtotal > settings.shipping.freeShippingThreshold ? 0 : settings.shipping.deliveryCharge;
      const user = await User.findById(userId).session(session);
      const preliminaryTotal = Math.max(
        0,
        subtotal + shippingFee + codFee + depositTotal - discount,
      );

      if (useWallet && user) {
        const potentialWalletDeduction = Math.min(preliminaryTotal, user.walletBalance || 0);
        if (potentialWalletDeduction > 0) {
          walletDeduction = potentialWalletDeduction;
          walletDeducted = true;
        }
      }

      const total = preliminaryTotal - walletDeduction;

      const randomSeq = crypto.randomBytes(3).toString('hex').toUpperCase();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${randomSeq}`;
      const trackingNumber = `TRK${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const courierPartner = 'Delhivery';
      const barcodeData = invoiceNumber;
      const frontendUrl = getFrontendUrl();
      const publicTrackingToken = LogisticsService.generateTrackingToken(pendingOrderId.toString());
      const qrCodeData = `${frontendUrl}/track/${pendingOrderId}?token=${publicTrackingToken}`;

      if (isCod) {
        // FOR COD: Perform all actual database mutations (Coupon, Wallet, Order)
        if (couponValid && couponDoc) {
          await Coupon.findByIdAndUpdate(
            couponDoc._id,
            {
              $inc: { usedCount: 1 },
              $push: { usedBy: { userId, orderId: pendingOrderId } },
            },
            { session },
          );
        }

        if (walletDeducted && walletDeduction > 0) {
          const updatedUser = await debitWalletBalance(userId, walletDeduction, session);
          if (!updatedUser) throw new ApiError(400, 'Insufficient wallet balance.');
          await WalletTransaction.create(
            [
              {
                userId: userId,
                type: 'debit',
                amount: walletDeduction,
                source: 'checkout_redeem',
                description: `Redeemed Siri Cash at checkout`,
                status: 'active',
              },
            ],
            { session },
          );
        }

        order = new Order({
          _id: pendingOrderId,
          user: userId,
          items: orderItems,
          shippingAddress,
          orderType: 'purchase',
          depositTotal,
          subtotal,
          shippingFee,
          discount,
          codFee,
          walletDeduction,
          total,
          couponCode: couponValid ? couponCode.toUpperCase() : undefined,
          paymentMethod: 'cod',
          paymentStatus: 'Pending COD',
          orderStatus: 'Confirmed',
          statusHistory: [
            { status: 'Confirmed', note: 'Cash on Delivery order successfully placed' },
          ],
          reservationIds,
          invoiceNumber,
          trackingNumber,
          courierPartner,
          weight: 1.8,
          dimensions: { length: 30, width: 20, height: 15 },
          packageType: 'Standard Box',
          barcodeData,
          qrCodeData,
          notes,
          needByDate,
          idempotencyKey,
          codCollected: false,
          settledAmount: 0,
          courierCharges: Math.round((shippingFee || settings.shipping.deliveryCharge) + codFee),
          earnings: 0,
          isCustomOrder,
          customOrderId,
        });

        await order.save({ session });

        // Increment sold count (ONLY for standard items)
        if (!isCustomOrder) {
          for (const item of orderItems) {
            if (item.productId) {
              await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { sold: item.quantity || 1 } },
                { session },
              );
            }
          }

          const orderedProductIds = order.items.map((item: any) => item.productId);
          await User.findByIdAndUpdate(
            userId,
            { $pull: { cart: { product: { $in: orderedProductIds } } } },
            { session },
          );
        } else {
          // Convert CustomOrder
          const CustomOrder = require('../../models/CustomOrder').default;
          await CustomOrder.findByIdAndUpdate(
            customOrderId,
            {
              convertedToOrder: true,
              convertedOrderId: order._id,
              status: isCod ? 'In Progress' : 'Payment Received',
            },
            { session },
          );
        }

        // Confirm inventory reservations via InventoryService (unified path for COD + online)
        for (const resId of reservationIds) {
          await InventoryService.confirmReservation(resId.toString(), session);
        }

        await OutboxEvent.create(
          [
            {
              aggregateId: order._id.toString(),
              aggregateType: 'Order',
              eventType: 'OrderCreated',
              payload: {
                orderId: order._id.toString(),
                userId: userId,
                type: 'cod',
              },
            },
          ],
          { session },
        );

        await session.commitTransaction();

        const resultCod = { order, type: 'cod' };
        await OrderIdempotencyManager.cacheResponseAndReleaseLock(
          userId,
          idempotencyKey,
          resultCod,
        );
        return resultCod;
      } else {
        // FOR RAZORPAY: Do NOT save the Order, do NOT increment coupon usage, do NOT deduct wallet.
        // We only reserve the inventory (already done above with TTL) and create a PaymentAttempt.
        await session.commitTransaction(); // Commit the inventory reservations so the TTL applies

        const options = {
          amount: Math.round(total * 100),
          currency: 'INR',
          receipt: `rcpt_${pendingOrderId}`,
        };

        let razorpayOrder;
        try {
          razorpayOrder = await RazorpayGateway.createOrder(options);
        } catch (err: any) {
          logger.error('Razorpay order creation failed.', err);
          // Release reservations manually since we failed instantly
          for (const resId of reservationIds) {
            await InventoryService.cancelReservation(resId.toString(), undefined);
          }
          throw new ApiError(
            502,
            'Payment gateway temporarily unavailable. Please try checking out again.',
          );
        }

        const attemptData = {
          pendingOrderId,
          userId,
          orderItems,
          shippingAddress,
          orderType: 'purchase',
          depositTotal,
          subtotal,
          shippingFee,
          discount,
          codFee: 0,
          walletDeduction,
          total,
          couponCode: couponValid ? couponCode.toUpperCase() : undefined,
          paymentMethod: 'razorpay',
          reservationIds,
          invoiceNumber,
          trackingNumber,
          courierPartner,
          barcodeData,
          qrCodeData,
          notes,
          needByDate,
          idempotencyKey,
          isCustomOrder,
          customOrderId,
        };

        await PaymentAttempt.create({
          razorpayOrderId: razorpayOrder.id,
          userId: userId,
          type: 'purchase',
          status: 'initiated',
          orderData: attemptData,
        });

        const resultOnline = {
          // Send back a placeholder object so frontend doesn't crash if it reads order._id
          order: { _id: pendingOrderId, total, idempotencyKey, razorpayOrderId: razorpayOrder.id },
          razorpayOrder: {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
          },
          type: 'online',
        };
        await OrderIdempotencyManager.cacheResponseAndReleaseLock(
          userId,
          idempotencyKey,
          resultOnline,
        );
        return resultOnline;
      }
    } catch (err: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      await OrderIdempotencyManager.releaseLock(userId, idempotencyKey);
      if (err.code === 11000 && err.keyPattern && err.keyPattern.idempotencyKey) {
        throw new ApiError(409, 'Duplicate order detected.');
      }
      throw err;
    } finally {
      session.endSession();
    }
  }
}
