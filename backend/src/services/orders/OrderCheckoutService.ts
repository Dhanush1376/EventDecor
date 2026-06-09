import crypto from 'crypto';
import mongoose from 'mongoose';
import { RazorpayGateway } from '../../utils/RazorpayGateway';
import Order from '../../models/Order';
import Product from '../../models/Product';
import User from '../../models/User';
import Coupon from '../../models/Coupon';
import ApiError from '../../utils/ApiError';
import logger from '../../config/logger';
import { cmsCache } from '../../utils/MemoryCache';
import ContentSection from '../../models/ContentSection';
import WalletTransaction from '../../models/WalletTransaction';
import { debitWalletBalance } from '../../utils/walletMutations';
import { LogisticsService } from '../../services/logisticsService';
import { OrderIdempotencyManager } from './OrderIdempotencyManager';
import OutboxEvent from '../../models/OutboxEvent';
import { InventoryService } from '../InventoryService';

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
    } = orderData;
    const isCod = paymentMethod === 'cod';

    const MAX_QUANTITY_PER_ITEM = 50;
    const MAX_ITEMS_PER_ORDER = 20;

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

      let walletDeducted = false;
      let walletDeduction = 0;
      let user: any;
      let order: any;

      let discount = 0;
      let couponValid = false;

      if (couponCode) {
        const coupon = await Coupon.findOneAndUpdate(
          {
            code: couponCode.toUpperCase(),
            isActive: true,
            $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
          },
          {
            $inc: { usedCount: 1 },
            $push: { usedBy: { userId, orderId: pendingOrderId } },
          },
          { returnDocument: 'after', session },
        );

        if (coupon && new Date() <= coupon.expiryDate && subtotal >= coupon.minOrderAmount) {
          couponValid = true;
          if (coupon.discountType === 'percentage') {
            discount = (subtotal * coupon.discountValue) / 100;
            if (coupon.maxDiscount && discount > coupon.maxDiscount) {
              discount = coupon.maxDiscount;
            }
          } else {
            discount = coupon.discountValue;
          }
          discount = Math.round(discount);
        } else {
          if (coupon) {
            await Coupon.findOneAndUpdate(
              { _id: coupon._id, 'usedBy.orderId': pendingOrderId, usedCount: { $gt: 0 } },
              {
                $inc: { usedCount: -1 },
                $pull: { usedBy: { orderId: pendingOrderId } },
              },
              { session },
            );
          }
          throw new ApiError(400, 'Coupon is invalid, expired, or usage limit reached');
        }
      }

      let codFee = 0;
      if (isCod) {
        try {
          const settingsSection = await cmsCache.getOrSet('studio_settings', async () => {
            return await ContentSection.findOne({ sectionKey: 'studio_settings' });
          });
          if (settingsSection && settingsSection.data && settingsSection.data.codFee) {
            codFee = Number(settingsSection.data.codFee) || 0;
          } else {
            codFee = 90;
          }
        } catch {
          codFee = 90;
        }
      }

      const shippingFee = subtotal > 2000 ? 0 : 100;
      user = await User.findById(userId).session(session);
      const preliminaryTotal = Math.max(
        0,
        subtotal + shippingFee + codFee + depositTotal - discount,
      );

      if (useWallet && user) {
        const potentialWalletDeduction = Math.min(preliminaryTotal, user.walletBalance || 0);
        if (potentialWalletDeduction > 0) {
          const updatedUser = await debitWalletBalance(userId, potentialWalletDeduction, session);
          if (updatedUser) {
            walletDeduction = potentialWalletDeduction;
            walletDeducted = true;
            user = updatedUser;
          } else {
            throw new ApiError(400, 'Insufficient wallet balance.');
          }
        }
      }

      const total = preliminaryTotal - walletDeduction;

      if (walletDeducted && walletDeduction > 0 && user) {
        await WalletTransaction.create(
          [
            {
              userId: user._id,
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

      const randomSeq = crypto.randomBytes(3).toString('hex').toUpperCase();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${randomSeq}`;
      const trackingNumber = `TRK${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const courierPartner = 'Delhivery';
      const barcodeData = invoiceNumber;
      const frontendUrl =
        process.env.FRONTEND_URLS?.split(',')[0]?.trim() || 'http://localhost:5173';
      const publicTrackingToken = LogisticsService.generateTrackingToken(pendingOrderId.toString());
      const qrCodeData = `${frontendUrl}/track/${pendingOrderId}?token=${publicTrackingToken}`;

      if (isCod) {
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
          settlementStatus: 'Pending',
          settledAmount: 0,
          courierCharges: Math.round((shippingFee || 120) + codFee),
          earnings: 0,
        });

        await order.save({ session });

        // Increment sold count
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
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // ENTERPRISE FIX: Create Order FIRST, then Razorpay order.
        //
        // Previously: Razorpay order created OUTSIDE the transaction.
        // If the process crashed between Razorpay.create() and Order.save(),
        // a real Razorpay order existed with no matching DB record â€” the
        // customer's money could be charged with no order to fulfill.
        //
        // Now: Save Order in 'pending' state first (inside transaction),
        // commit, then create Razorpay order, then atomically link them.
        // If Razorpay fails, the Order exists for reconciliation recovery.
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
          codFee: 0,
          walletDeduction,
          total,
          couponCode: couponValid ? couponCode.toUpperCase() : undefined,
          paymentMethod: 'razorpay',
          paymentStatus: 'pending',
          reservationIds,
          statusHistory: [
            { status: 'pending', note: 'Order initiated via Checkout', updatedBy: 'system' },
          ],
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
        });

        await order.save({ session });
        await OutboxEvent.create(
          [
            {
              aggregateId: order._id.toString(),
              aggregateType: 'Order',
              eventType: 'OrderInitiated',
              payload: {
                orderId: order._id.toString(),
                userId: userId,
                type: 'online',
              },
            },
          ],
          { session },
        );

        await session.commitTransaction();

        // â”€â”€ Razorpay Order Creation (OUTSIDE transaction, AFTER Order is persisted) â”€â”€

        const options = {
          amount: Math.round(total * 100),
          currency: 'INR',
          receipt: `rcpt_${pendingOrderId}`,
        };

        let razorpayOrder;
        try {
          razorpayOrder = await RazorpayGateway.createOrder(options);
        } catch (err: any) {
          logger.error('Razorpay order creation failed. Initiating compensation flow...', err);

          // Compensation flow
          try {
            // 1. Update order status to failed
            await Order.findByIdAndUpdate(pendingOrderId, {
              orderStatus: 'Failed',
              paymentStatus: 'failed',
              $push: {
                statusHistory: {
                  status: 'Failed',
                  note: 'Razorpay order creation failed',
                  updatedBy: 'system',
                },
              },
            });

            // 2. Refund wallet if used
            if (walletDeducted && walletDeduction > 0 && user) {
              const { creditWalletBalance } = require('../../utils/walletMutations');
              await creditWalletBalance(userId, walletDeduction, null);
              await WalletTransaction.create({
                userId: user._id,
                type: 'credit',
                amount: walletDeduction,
                source: 'refund',
                description: `Refund for failed checkout (Gateway error)`,
                status: 'active',
              });
            }

            // 3. Rollback coupon usage
            if (couponValid && couponCode) {
              await Coupon.findOneAndUpdate(
                { code: couponCode.toUpperCase() },
                {
                  $inc: { usedCount: -1 },
                  $pull: { usedBy: { orderId: pendingOrderId } },
                },
              );
            }

            // 4. Release inventory reservations
            for (const resId of reservationIds) {
              await InventoryService.cancelReservation(resId.toString(), undefined);
            }
          } catch (compErr: any) {
            logger.error(`[CRITICAL] Compensation failed for Order ${pendingOrderId}:`, compErr);
            const { AlertingService } = require('../AlertingService');
            await AlertingService.paymentFailure('Checkout Compensation Failure', {
              orderId: pendingOrderId.toString(),
              error: compErr.message,
            });
          }

          throw new ApiError(
            502,
            'Payment gateway temporarily unavailable. Please try checking out again.',
          );
        }

        // Atomically link Razorpay order ID to the saved Order (with retry loop)
        let linkRetries = 3;
        let isLinked = false;
        while (linkRetries > 0 && !isLinked) {
          try {
            await Order.findByIdAndUpdate(pendingOrderId, {
              $set: { razorpayOrderId: razorpayOrder.id },
            });
            isLinked = true;
          } catch (linkErr: any) {
            linkRetries--;
            if (linkRetries === 0) {
              logger.error(
                `[CRITICAL] Failed to link Razorpay Order ID ${razorpayOrder.id} to Order ${pendingOrderId} after 3 attempts:`,
                linkErr,
              );
              // Order exists but lacks razorpayOrderId.
              // If customer pays, webhook won't find the order.

              const { AlertingService } = require('../AlertingService');
              await AlertingService.paymentFailure('Order Link Failure', {
                orderId: pendingOrderId.toString(),
                razorpayOrderId: razorpayOrder.id,
                error: linkErr.message,
              });
            } else {
              await new Promise((res) => setTimeout(res, 500));
            }
          }
        }

        const resultOnline = {
          order: { ...order.toObject(), razorpayOrderId: razorpayOrder.id },
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
