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
import { OrderIdempotencyManager } from './OrderIdempotencyManager';
import OutboxEvent from '../../models/OutboxEvent';
import { computeOrderTotals } from './orderTotals';
import { InventoryService } from '../InventoryService';
import { InvoiceService } from '../InvoiceService';

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

        // Push a single mock item into orderItems for the custom order
        orderItems.push({
          title: `Custom Design: ${customOrderObj.occasion || customOrderObj.productType || 'Decor'}`,
          price: subtotal,
          quantity: 1,
          variant: 'Custom',
          imageSrc:
            customOrderObj.inspirationImages?.[0] ||
            'https://res.cloudinary.com/drxgnnzeb/image/upload/v1785779448/siri-arts-crafts/zqqwwbsrjpb7bqcrl24l.png',
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
          code: couponCode.toUpperCase().trim(),
          isActive: true,
        }).session(session);

        if (
          couponDoc &&
          new Date() <= couponDoc.expiryDate &&
          subtotal >= couponDoc.minOrderAmount &&
          (!couponDoc.usageLimit || couponDoc.usedCount < couponDoc.usageLimit)
        ) {
          couponValid = true;
          let applicableAmount = subtotal;

          if (
            couponDoc.targetType === 'products' &&
            couponDoc.targetProductIds &&
            couponDoc.targetProductIds.length > 0
          ) {
            const productIdsStr = couponDoc.targetProductIds.map((id: any) => id.toString());
            applicableAmount = orderItems
              .filter((item) => productIdsStr.includes(item.productId.toString()))
              .reduce((sum, item) => sum + item.price * item.quantity, 0);
          } else if (
            couponDoc.targetType === 'categories' &&
            couponDoc.targetCategories &&
            couponDoc.targetCategories.length > 0
          ) {
            const targetCatsLower = couponDoc.targetCategories.map((c: any) =>
              (c || '').toLowerCase().trim(),
            );
            applicableAmount = orderItems
              .filter((item) =>
                targetCatsLower.includes((item.category || '').toLowerCase().trim()),
              )
              .reduce((sum, item) => sum + item.price * item.quantity, 0);
          }

          if (applicableAmount > 0) {
            if (couponDoc.discountType === 'percentage') {
              discount = (applicableAmount * couponDoc.discountValue) / 100;
              if (couponDoc.maxDiscount && discount > couponDoc.maxDiscount) {
                discount = couponDoc.maxDiscount;
              }
            } else {
              discount = Math.min(applicableAmount, couponDoc.discountValue);
            }
            discount = Math.round(discount);
          } else {
            throw new ApiError(400, 'Coupon is not applicable to the items in your cart');
          }
        } else {
          throw new ApiError(400, 'Coupon is invalid, expired, or usage limit reached');
        }
      }

      const user = await User.findById(userId).session(session);
      const totals = computeOrderTotals({
        subtotal,
        discount,
        depositTotal,
        isCod,
        codFee: settings.payments.codFee,
        freeShippingThreshold: settings.shipping.freeShippingThreshold,
        deliveryCharge: settings.shipping.deliveryCharge,
        useWallet: Boolean(useWallet && user),
        walletBalance: user?.walletBalance || 0,
      });

      const { shippingFee, codFee, total } = totals;
      walletDeduction = totals.walletDeduction;
      if (walletDeduction > 0) walletDeducted = true;

      // Generate immutable invoice snapshots (sequential number, store identity, tax breakdown)
      const invoiceSnapshots = await InvoiceService.generateOrderSnapshots(
        { subtotal, discount, shippingFee, codFee, walletDeduction, total },
        {
          taxRate: settings.taxes.gstRate,
          cgstRate: settings.taxes.cgstRate,
          sgstRate: settings.taxes.sgstRate,
          taxInclusive: settings.taxes.taxInclusive,
        },
      );
      const invoiceNumber = invoiceSnapshots.invoice.number;

      // WAREHOUSE LIFECYCLE: Logistics identifiers are NOT generated at checkout.
      // trackingNumber, courierPartner, barcodeData, qrCodeData are all null until
      // the warehouse creates a Package (PKG-) and courier assigns an AWB.
      // This ensures every barcode/tracking number maps to a real database entity.

      // --- RULE ENGINE INTEGRATION ---
      const { RuleEngine } = require('../../domains/rules/services/RuleEngine');
      const orderPayloadForRules = {
        _id: pendingOrderId,
        user: userId,
        items: orderItems,
        subtotal,
        total,
        discount,
        couponCode,
        paymentMethod: isCod ? 'cod' : 'razorpay',
      };

      const ruleResult = await RuleEngine.evaluate(orderPayloadForRules, 'Order', session);
      const requiresApproval = ruleResult.requiresApproval;
      // -------------------------------

      const isInstantWallet = !isCod && total === 0 && walletDeduction > 0;
      const isInstantCheckout = isCod || isInstantWallet;

      if (isInstantCheckout) {
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
          paymentMethod: isCod ? 'cod' : 'wallet',
          paymentStatus: isCod ? 'Pending COD' : 'Paid',
          orderStatus: requiresApproval ? 'Pending Approval' : 'Confirmed',
          statusHistory: [
            {
              status: requiresApproval ? 'Pending Approval' : 'Confirmed',
              note: requiresApproval
                ? 'Order requires manual approval based on business rules'
                : isCod
                  ? 'Cash on Delivery order successfully placed'
                  : 'Order successfully placed and fully paid using wallet balance',
            },
          ],
          reservationIds,
          invoiceNumber,
          // Immutable invoice snapshots
          invoice: invoiceSnapshots.invoice,
          store: invoiceSnapshots.store,
          tax: invoiceSnapshots.tax,
          // trackingNumber, courierPartner, barcodeData, qrCodeData are intentionally
          // omitted — they will be populated when warehouse dispatch creates real entities.
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

        try {
          const { RuleEngine } = require('../RuleEngine');
          const userForRule = await User.findById(userId).lean().session(session);
          await RuleEngine.evaluateTrigger('on_checkout', { user: userForRule, order });
        } catch (ruleErr) {
          logger.error('Failed to evaluate checkout rules (COD):', ruleErr);
        }

        await session.commitTransaction();

        try {
          const { emitAdminEvent } = require('../../socket');
          emitAdminEvent('order_update', { orderId: pendingOrderId });
        } catch (e) {
          logger.warn('Failed to emit admin order_update event for COD order', e);
        }

        const resultInstant = { order, type: isCod ? 'cod' : 'wallet', isInstantCheckout: true };
        await OrderIdempotencyManager.cacheResponseAndReleaseLock(
          userId,
          idempotencyKey,
          resultInstant,
        );

        // Fire WhatsApp Notification for Order
        try {
          const {
            WhatsAppTriggers,
          } = require('../../domains/notifications/whatsapp/whatsappTriggerHooks');
          await WhatsAppTriggers.onOrderCreated(order);
        } catch (e) {
          logger.error('Failed to trigger WhatsApp notification', e);
        }

        return resultInstant;
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
          // Immutable invoice snapshots (carried through to Order on payment verification)
          invoice: invoiceSnapshots.invoice,
          store: invoiceSnapshots.store,
          tax: invoiceSnapshots.tax,
          // trackingNumber, courierPartner, barcodeData, qrCodeData omitted from
          // PaymentAttempt — set during warehouse dispatch, not at checkout.
          notes,
          needByDate,
          idempotencyKey,
          isCustomOrder,
          customOrderId,
          requiresApproval, // Added for webhook processing
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
