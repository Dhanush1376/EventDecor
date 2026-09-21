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
import { TaxEngine } from '../taxes/TaxEngine';

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
      codVerificationToken,
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

      if (!shippingAddress?.state) {
        throw new ApiError(400, 'Destination state is required for delivery and tax compliance.');
      }

      const storeState =
        settings.contact?.state || settings.legal?.registeredAddress || 'Andhra Pradesh';

      const taxResult = TaxEngine.calculateTax({
        subtotal,
        discount,
        storeState,
        customerState: shippingAddress.state,
        taxConfig: {
          gstEnabled: settings.taxes?.gstEnabled,
          taxInclusive: settings.taxes?.taxInclusive,
          gstRate: settings.taxes?.gstRate,
          cgstRate: settings.taxes?.cgstRate,
          sgstRate: settings.taxes?.sgstRate,
        },
      });

      const user = await User.findById(userId).session(session);

      const totals = computeOrderTotals({
        subtotal,
        discount,
        depositTotal,
        isCod,
        codFee: settings.payments.codFee,
        enableFreeShipping: settings.shipping.enableFreeShipping,
        freeShippingThreshold: settings.shipping.freeShippingThreshold,
        deliveryCharge: settings.shipping.deliveryCharge,
        platformFee: settings.orders.platformFee || 0,
        taxAmount: taxResult.taxAmount,
        isTaxInclusive: taxResult.taxInclusive,
        useWallet: Boolean(useWallet && user && settings.loyalty.walletEnabled),
        walletBalance: user?.walletBalance || 0,
      });

      const { shippingFee, platformFee, codFee, total } = totals;
      const isZeroTotalOrder = total === 0;

      const orderValueForLimits = Math.max(0, subtotal - discount);
      if (settings.orders.minOrderValue && orderValueForLimits < settings.orders.minOrderValue) {
        throw new ApiError(400, `Minimum order value must be ₹${settings.orders.minOrderValue}`);
      }
      if (settings.orders.maxOrderValue && orderValueForLimits > settings.orders.maxOrderValue) {
        throw new ApiError(400, `Maximum order value must be ₹${settings.orders.maxOrderValue}`);
      }

      if (isCod && !isZeroTotalOrder) {
        if (!settings.payments.enableCOD) {
          throw new ApiError(400, 'Cash on Delivery is currently disabled.');
        }
        if (settings.payments.codMinOrder && subtotal < settings.payments.codMinOrder) {
          throw new ApiError(
            400,
            `Minimum order amount for COD is ₹${settings.payments.codMinOrder}`,
          );
        }
        if (settings.payments.codMaxOrder && subtotal > settings.payments.codMaxOrder) {
          throw new ApiError(
            400,
            `Maximum order amount for COD is ₹${settings.payments.codMaxOrder}`,
          );
        }

        // --- STRICT COD PHONE VERIFICATION VALIDATION ---
        if (!shippingAddress || !shippingAddress.phone) {
          throw new ApiError(
            400,
            'A delivery address with a valid phone number is required for Cash on Delivery.',
          );
        }

        const { PhoneAuthService } = require('../PhoneAuthService');
        let normalizedShippingPhone: string;
        try {
          normalizedShippingPhone = PhoneAuthService.normalizePhone(shippingAddress.phone);
        } catch {
          throw new ApiError(400, 'Invalid delivery address phone number format.');
        }

        if (!codVerificationToken) {
          throw new ApiError(
            400,
            'Cash on Delivery verification is required. Please verify with OTP.',
          );
        }

        const jwt = require('jsonwebtoken');
        let decodedCodToken: any;
        try {
          decodedCodToken = jwt.verify(codVerificationToken, process.env.JWT_SECRET!);
        } catch {
          throw new ApiError(
            400,
            'Invalid or expired COD verification session. Please verify again.',
          );
        }

        if (decodedCodToken.purpose !== 'COD_ORDER_VERIFICATION') {
          throw new ApiError(400, 'Invalid COD verification token purpose.');
        }

        if (decodedCodToken.userId && decodedCodToken.userId.toString() !== userId.toString()) {
          throw new ApiError(403, 'COD verification does not match the active customer account.');
        }

        if (
          decodedCodToken.channel === 'email' ||
          (!decodedCodToken.phone && decodedCodToken.email)
        ) {
          const orderEmail = (shippingAddress.email || user?.email || '').toLowerCase().trim();
          const tokenEmail = (decodedCodToken.email || '').toLowerCase().trim();
          if (!tokenEmail || tokenEmail !== orderEmail) {
            throw new ApiError(
              400,
              'Verified COD email does not match the customer delivery email. Please re-verify with OTP.',
            );
          }
        } else {
          if (decodedCodToken.phone !== normalizedShippingPhone) {
            throw new ApiError(
              400,
              'Verified COD phone does not match the selected delivery address phone. Please re-verify with OTP.',
            );
          }
        }

        // Atomic single-use consumption of OtpChallenge to prevent replay
        const OtpChallenge = require('../../models/OtpChallenge').default;
        const consumedChallenge = await OtpChallenge.findOneAndUpdate(
          {
            challengeId: decodedCodToken.challengeId,
            purpose: 'COD_VERIFICATION',
            consumedAt: null,
          },
          { $set: { consumedAt: new Date(), exhausted: true } },
          { session },
        );

        if (!consumedChallenge) {
          throw new ApiError(
            400,
            'COD verification code has already been used or expired. Please verify again.',
          );
        }
      } else if (paymentMethod === 'razorpay' && !isZeroTotalOrder) {
        if (!settings.payments.enableRazorpay) {
          throw new ApiError(400, 'Online payments are currently disabled.');
        }
      }

      walletDeduction = totals.walletDeduction;
      if (walletDeduction > 0) walletDeducted = true;

      // Generate immutable invoice snapshots (sequential number, store identity, self-contained tax breakdown)
      const invoiceSnapshots = await InvoiceService.generateOrderSnapshots(
        { subtotal, discount, shippingFee, codFee, walletDeduction, total },
        taxResult,
        {
          hsnCode: settings.taxes?.hsnCode,
          invoicePrefix: settings.taxes?.invoicePrefix,
          invoiceFooter: settings.taxes?.invoiceFooter,
        },
      );
      const invoiceNumber = invoiceSnapshots.invoice.number;

      // WAREHOUSE LIFECYCLE: Logistics identifiers are NOT generated at checkout.
      // trackingNumber, courierPartner, barcodeData, qrCodeData are all null until
      // the warehouse creates a Package (PKG-) and courier assigns an AWB.
      // This ensures every barcode/tracking number maps to a real database entity.

      const requiresApproval = false;

      const _isInstantWallet = isZeroTotalOrder && walletDeduction > 0;
      const isInstantCheckout = (isCod && !isZeroTotalOrder) || isZeroTotalOrder;

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

        if (shippingAddress?.name && typeof shippingAddress.name === 'string') {
          const trimmedName = shippingAddress.name.trim();
          if (trimmedName && trimmedName.toLowerCase() !== 'customer') {
            if (user && (!user.name || user.name === 'Customer' || user.name.trim() === '')) {
              user.name = trimmedName;
              await user.save({ session });
            }
          }
        }

        const { PhoneAuthService } = require('../PhoneAuthService');
        const normalizedShippingPhone = shippingAddress?.phone
          ? PhoneAuthService.normalizePhone(shippingAddress.phone)
          : '';

        order = new Order({
          _id: pendingOrderId,
          user: userId,
          items: orderItems,
          shippingAddress,
          customerName: user?.name || shippingAddress?.name || '',
          customerEmail: user?.email || shippingAddress?.email || '',
          customerPhone: user?.phone || normalizedShippingPhone,
          shippingPhone: normalizedShippingPhone,
          codPhoneVerified: isCod && !isZeroTotalOrder,
          codVerifiedAt: isCod && !isZeroTotalOrder ? new Date() : undefined,
          orderType: 'purchase',
          depositTotal,
          subtotal,
          shippingFee,
          platformFee,
          discount,
          codFee,
          walletDeduction,
          total,
          couponCode: couponValid ? couponCode.toUpperCase() : undefined,
          paymentMethod: isZeroTotalOrder
            ? walletDeduction > 0
              ? 'wallet'
              : 'coupon'
            : isCod
              ? 'cod'
              : 'razorpay',
          paymentStatus: isZeroTotalOrder ? 'paid' : isCod ? 'Pending COD' : 'paid',
          orderStatus: requiresApproval ? 'Pending Approval' : 'Confirmed',
          statusHistory: [
            {
              status: requiresApproval ? 'Pending Approval' : 'Confirmed',
              note: requiresApproval
                ? 'Order requires manual approval based on business rules'
                : isZeroTotalOrder
                  ? walletDeduction > 0
                    ? 'Order successfully placed and fully paid using wallet balance'
                    : 'Order successfully placed (100% discount applied)'
                  : isCod
                    ? 'Cash on Delivery order successfully placed'
                    : 'Order successfully placed',
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
                type: isZeroTotalOrder ? 'wallet' : isCod ? 'cod' : 'razorpay',
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
          logger.error('Failed to evaluate checkout rules (instant):', ruleErr);
        }

        await session.commitTransaction();

        try {
          const { emitAdminEvent } = require('../../socket');
          emitAdminEvent('order_update', { orderId: pendingOrderId });
        } catch (e) {
          logger.warn('Failed to emit admin order_update event for instant order', e);
        }

        const resultInstant = {
          order,
          type: isZeroTotalOrder ? 'wallet' : isCod ? 'cod' : 'razorpay',
          isInstantCheckout: true,
        };
        await OrderIdempotencyManager.cacheResponseAndReleaseLock(
          userId,
          idempotencyKey,
          resultInstant,
        );

        // Marketing lifecycle cancellation & conversion attribution
        try {
          const {
            default: AutomationEngineService,
          } = require('../marketing/AutomationEngineService');
          AutomationEngineService.cancelUserEnrollments(userId, 'purchased').catch(() => {});
          AutomationEngineService.attributeOrderConversion(order).catch(() => {});
        } catch (_mktErr) {}

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

        const { PhoneAuthService: PhoneAuthSvc } = require('../PhoneAuthService');
        const normalizedAttemptShippingPhone = shippingAddress?.phone
          ? PhoneAuthSvc.normalizePhone(shippingAddress.phone)
          : '';

        const attemptData = {
          pendingOrderId,
          userId,
          customerName: user?.name || shippingAddress?.name || '',
          customerEmail: user?.email || shippingAddress?.email || '',
          customerPhone: user?.phone || normalizedAttemptShippingPhone,
          shippingPhone: normalizedAttemptShippingPhone,
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
