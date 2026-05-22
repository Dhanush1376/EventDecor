import crypto from 'crypto';
import mongoose from 'mongoose';
import razorpay from '../config/razorpay';
import Order, { IOrder } from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import Coupon from '../models/Coupon';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { formatPaginationResponse, getPaginationOptions } from '../utils/pagination';
import { sendDirectEmail } from './notificationService';
import AnalyticsService from './analyticsService';
import { cmsCache } from '../utils/MemoryCache';
import { getAdminEmails } from '../config/adminConfig';
import { bumpAdminAnalyticsCacheVersion } from '../utils/cacheVersion';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { debitWalletBalance } from '../utils/walletMutations';
import ContentSection from '../models/ContentSection';
import WalletTransaction from '../models/WalletTransaction';
import { createAdminNotification } from './notificationService';
import { compileTemplate } from '../utils/templateEngine';
import { LoyaltyService } from './loyaltyService';
import { emitUserEvent } from '../socket';
import { redisClient } from '../utils/redis';

class OrderService {
  static async validateTotals(userId: string, data: any) {
    const { items, couponCode } = data;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, 'Items array is required');
    }

    let subtotal = 0;
    const productIds = [...new Set(items.map((item: any) => String(item.productId)).filter(Boolean))] as any[];
    const products = await Product.find({ _id: { $in: productIds } }).select('title price stock category isActive');
    const productsById = new Map<string, any>(products.map((product: any) => [product._id.toString(), product]));
    
    // 1. Validate stock availability and calculate actual subtotal from DB
    for (const item of items) {
      const product = productsById.get(String(item.productId));
      if (!product) throw new ApiError(404, `Product not found: ${item.productId}`);
      if (!product.isActive) throw new ApiError(400, `Product is no longer active: ${product.title}`);
      if (product.stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for product: ${product.title}`);
      }
      subtotal += product.price * item.quantity;
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
        if (coupon.targetType === 'tiers' && coupon.targetUserTiers && coupon.targetUserTiers.length > 0) {
          if (!coupon.targetUserTiers.includes(loyaltyTier)) {
            couponMessage = `This coupon is exclusively reserved for loyalty levels: ${coupon.targetUserTiers.join(', ')}`;
          }
        }

        if (!couponMessage) {
          // Dynamic Product/Category targeting checks
          let applicableAmount = 0;
          if (coupon.targetType === 'products' && coupon.targetProductIds && coupon.targetProductIds.length > 0) {
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
          } else if (coupon.targetType === 'categories' && coupon.targetCategories && coupon.targetCategories.length > 0) {
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
    const shippingFee = subtotal > 2000 || subtotal === 0 ? 0 : 100;
    const platformFee = 0;
    
    let codFee = 0;
    if (paymentMethod && paymentMethod.toLowerCase() === 'cod') {
      try {
        const settingsSection = await cmsCache.getOrSet('studio_settings', async () => {
          return await ContentSection.findOne({ sectionKey: 'studio_settings' });
        });
        if (settingsSection && settingsSection.data && settingsSection.data.codFee) {
          codFee = Number(settingsSection.data.codFee) || 0;
        } else {
          codFee = 90;
        }
      } catch (err) {
        codFee = 90;
      }
    }

    const preliminaryTotal = Math.max(0, subtotal + shippingFee + codFee - discount);
    
    let walletDeduction = 0;
    if (useWallet) {
      walletDeduction = Math.min(preliminaryTotal, availableWallet);
    }

    const total = preliminaryTotal - walletDeduction;

    // Estimate Siri Coins (1 Siri Coin per ₹10 spent on subtotal)
    const coinsToEarn = Math.round(subtotal / 10);
    
    // Estimate Cashback percentage based on membership tier
    let cashbackRate = 0.02; // Bronze: 2%
    if (loyaltyTier === 'Silver') cashbackRate = 0.05;
    else if (loyaltyTier === 'Gold') cashbackRate = 0.08;
    else if (loyaltyTier === 'Platinum') cashbackRate = 0.12;

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
      couponValid,
      couponMessage,
    };
  }

  static async createOrder(userId: string, orderData: any) {
    const { items, shippingAddress, couponCode, notes, needByDate, paymentMethod, useWallet, idempotencyKey } = orderData;
    const isCod = paymentMethod === 'cod';

    // Idempotency check: if the client provided an Idempotency-Key, check Redis cache first
    let redisKey = '';
    if (idempotencyKey && redisClient) {
      redisKey = `idempotency:order:${userId}:${idempotencyKey}`;
      try {
        const cachedResponse = await redisClient.get(redisKey);
        if (cachedResponse) {
          logger.info(`[IDEMPOTENCY] Returning cached order creation for key: ${idempotencyKey}`);
          return JSON.parse(cachedResponse);
        }
      } catch (err) {
        logger.warn('Redis error during idempotency check:', err);
      }
    }

    let subtotal = 0;
    const orderItems = [];

    // 1. Batch-query products at once to eliminate N+1 findById queries inside the loop
    const productIds = [...new Set(items.map((item: any) => String(item.productId)).filter(Boolean))] as any[];
    const products = await Product.find({ _id: { $in: productIds } }).select('title price stock isActive imageSrc category');
    const productsById = new Map<string, any>(products.map((p: any) => [p._id.toString(), p]));

    // Pre-validate all items before doing any stock updates to maintain transactional integrity
    for (const item of items) {
      const product = productsById.get(String(item.productId));
      if (!product) throw new ApiError(404, `Product ${item.productId} not found`);
      if (!product.isActive) throw new ApiError(400, `Product is no longer active: ${product.title}`);
      if (product.stock < item.quantity) {
        throw new ApiError(400, `Insufficient stock for product: ${product.title}`);
      }
    }

    // Reserve stock atomically now that pre-validation has passed
    const reservedItems: { productId: string; quantity: number }[] = [];
    try {
      for (const item of items) {
        const product = productsById.get(String(item.productId))!;
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity }, isActive: true },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );

        if (!updatedProduct) {
          throw new ApiError(400, `Insufficient stock or inactive product: ${product.title}`);
        }

        // Post-check: ensure product remains active at reservation time
        if (!updatedProduct.isActive) {
          throw new ApiError(400, `Product is no longer active: ${product.title}`);
        }

        reservedItems.push({ productId: String(item.productId), quantity: item.quantity });
        
        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;
        
        orderItems.push({
          productId: product._id,
          title: product.title,
          price: product.price,
          quantity: item.quantity,
          variant: item.variant || 'Default',
          imageSrc: product.imageSrc,
          category: product.category,
        });
      }
    } catch (err) {
      // Rollback successfully reserved stock to prevent stock leaks
      for (const reserved of reservedItems) {
        await Product.findByIdAndUpdate(reserved.productId, { $inc: { stock: reserved.quantity } });
      }
      throw err;
    }

    // 2. Validate and apply Coupon discounts securely on the backend
    let walletDeducted = false;
    let walletDeduction = 0;
    let user: any = null;
    let order: any = null;

    try {
      let discount = 0;
      let couponValid = false;

      if (couponCode) {
        // Validate coupon but do NOT increment usedCount yet — that happens on payment confirmation
        // to prevent double-counting when both createOrder and verifyPayment run
        const coupon = await Coupon.findOne({
          code: couponCode.toUpperCase(),
          isActive: true,
          $or: [
            { usageLimit: null },
            { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
          ]
        });
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
        } catch (err) {
          codFee = 90;
        }
      }

      const shippingFee = subtotal > 2000 ? 0 : 100;
      user = await User.findById(userId);
      const preliminaryTotal = Math.max(0, subtotal + shippingFee + codFee - discount);

      if (useWallet && user) {
        const potentialWalletDeduction = Math.min(preliminaryTotal, user.walletBalance || 0);
        if (potentialWalletDeduction > 0) {
          const updatedUser = await debitWalletBalance(userId, potentialWalletDeduction);
          if (updatedUser) {
            walletDeduction = potentialWalletDeduction;
            walletDeducted = true;
            user = updatedUser;
          }
        }
      }

      const total = preliminaryTotal - walletDeduction;

      // Log wallet debit transaction if atomic deduction succeeded
      if (walletDeducted && walletDeduction > 0 && user) {
        await WalletTransaction.create([{
          userId: user._id,
          type: 'debit',
          amount: walletDeduction,
          source: 'checkout_redeem',
          description: `Redeemed Siri Cash at checkout`,
          status: 'active'
        }]);
      }

      // Auto-generate enterprise logistics fields using cryptographically random ID
      const randomSeq = crypto.randomBytes(3).toString('hex').toUpperCase();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${randomSeq}`;
      const trackingNumber = `TRK${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const publicTrackingToken = crypto.randomBytes(24).toString('hex');
      const courierPartner = 'Delhivery';
      const barcodeData = invoiceNumber;
      const frontendUrl = process.env.FRONTEND_URLS?.split(',')[0]?.trim() || 'http://localhost:5173';
      const qrCodeData = `${frontendUrl}/track/${encodeURIComponent('pending')}`;

      if (isCod) {
        // Pre-assign tracking URL synchronously (order._id is generated on instantiation)
        const pendingOrderId = new mongoose.Types.ObjectId();
        const finalQrCodeData = `${frontendUrl}/track/${pendingOrderId}?token=${publicTrackingToken}`;

        order = new Order({
          _id: pendingOrderId,
          user: userId,
          items: orderItems,
          shippingAddress,
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
          statusHistory: [{ status: 'Confirmed', note: 'Cash on Delivery order successfully placed' }],
          invoiceNumber,
          trackingNumber,
          courierPartner,
          weight: 1.8,
          dimensions: { length: 30, width: 20, height: 15 },
          packageType: 'Standard Box',
          barcodeData,
          qrCodeData: finalQrCodeData,
          publicTrackingToken,
          notes,
          needByDate,
          codCollected: false,
          settlementStatus: 'Pending',
          settledAmount: 0,
          courierCharges: Math.round((shippingFee || 120) + codFee), // Shipping fee + COD handling fee
          earnings: 0,
        });

        await order.save();
        await User.findByIdAndUpdate(userId, { $push: { orders: order._id } });
        AnalyticsService.clearCache();

        // Clear the user's cart in database immediately
        await User.findByIdAndUpdate(userId, { $set: { cart: [] } });

        const resultCod = {
          order,
          type: 'cod',
        };

        if (redisKey && redisClient) {
          try {
            await redisClient.set(redisKey, JSON.stringify(resultCod), { EX: 86400 });
          } catch (err) {
            logger.warn('Redis error during idempotency save:', err);
          }
        }

        // Trigger Admin Alert, Invoice PDF, and Dispatch Email
        try {
          const user = await User.findById(userId);

          // 1. Send Admin Real-time Notification
          await createAdminNotification({
            title: 'New Order Received',
            message: `${user?.name || 'A customer'} placed a new COD order (₹${order.total}).`,
            type: 'order',
            actionLink: `/admin/orders/${order._id}`,
          });

          // 2. Generate PDF Invoice
          const pdfBuffer = await generateInvoicePDF({
            orderId: order._id.toString(),
            date: order.createdAt || new Date(),
            customerName: user?.name || 'Customer',
            shippingAddress: typeof order.shippingAddress === 'string' ? order.shippingAddress : order.shippingAddress?.address || '',
            items: order.items,
            subtotal: order.subtotal,
            shipping: order.shippingFee,
            total: order.total
          });

          if (user) {
            const frontendUrl = process.env.FRONTEND_URLS?.split(',')[0] || 'http://localhost:5173';
            
            // 3. Compile beautiful HTML Template
            const htmlContent = compileTemplate('order-confirmation', {
              customerName: user.name,
              orderId: order._id.toString(),
              orderDate: new Date().toISOString(),
              paymentMethod: 'Cash on Delivery',
              items: order.items.map((i: any) => ({
                name: i.title,
                variant: i.variant,
                quantity: i.quantity,
                price: i.price,
                image: i.imageSrc
              })),
              subtotal: order.subtotal,
              shipping: order.shippingFee,
              total: order.total,
              shippingAddress: typeof order.shippingAddress === 'string' ? order.shippingAddress : order.shippingAddress?.address || '',
              dashboardUrl: `${frontendUrl}/dashboard?tab=orders`,
              currentYear: new Date().getFullYear(),
            });

            // 4. Send Customer Email
            await sendDirectEmail({
              email: user.email,
              subject: `Order Successfully Placed! ✦ Siri Arts & Crafts [${order._id}]`,
              customHtml: htmlContent,
              type: 'order',
              action: 'order_placed',
              userId: user._id.toString(),
              attachments: [{
                filename: `Invoice_${order.invoiceNumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
              }]
            });
            
            // 5. Send Admin Alert Email
            const adminEmails = getAdminEmails();
            if (adminEmails.length > 0) {
              await sendDirectEmail({
                email: adminEmails[0], // primary admin
                subject: `New Order Received - ₹${order.total} [${order._id}]`,
                customHtml: htmlContent, // Reuse same elegant template
                type: 'system',
                action: 'admin_order_alert',
                attachments: [{
                  filename: `Invoice_${order.invoiceNumber}.pdf`,
                  content: pdfBuffer,
                  contentType: 'application/pdf'
                }]
              });
            }
          }
        } catch (emailErr) {
          logger.error('Failed to dispatch COD confirmation email/PDF:', emailErr);
        }

        return resultCod;
      } else {
        // 3b. Handle online Razorpay payment
        const options = {
          amount: Math.round(total * 100),
          currency: "INR",
          receipt: `rcpt_${Date.now()}`,
        };

        if (!razorpay) {
          throw new ApiError(500, 'Payment gateway is not configured. Contact support.');
        }

        let razorpayOrder;
        try {
          razorpayOrder = await razorpay.orders.create(options);
        } catch (err: any) {
          logger.error('Razorpay order creation failed:', err);
          throw new ApiError(500, 'Payment initialization failed');
        }

        const pendingOrderId = new mongoose.Types.ObjectId();
        const finalQrCodeData = `${frontendUrl}/track/${pendingOrderId}?token=${publicTrackingToken}`;

        // 4. Save pending order with Razorpay details
        order = new Order({
          _id: pendingOrderId,
          user: userId,
          items: orderItems,
          shippingAddress,
          subtotal,
          shippingFee,
          discount,
          walletDeduction,
          total,
          couponCode: couponValid ? couponCode.toUpperCase() : undefined,
          paymentMethod: 'razorpay',
          razorpayOrderId: razorpayOrder.id,
          paymentStatus: 'pending',
          orderStatus: 'Pending',
          statusHistory: [{ status: 'Pending', note: 'Order initiated and stock reserved' }],
          invoiceNumber,
          trackingNumber,
          courierPartner,
          weight: 1.8,
          dimensions: { length: 30, width: 20, height: 15 },
          packageType: 'Standard Box',
          barcodeData,
          qrCodeData: finalQrCodeData,
          publicTrackingToken,
          notes,
          needByDate,
        });

        await order.save();
        await User.findByIdAndUpdate(userId, { $push: { orders: order._id } });

        const result = {
          order,
          razorpayOrder: {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
          },
          type: 'online'
        };

        if (redisKey && redisClient) {
          try {
            await redisClient.set(redisKey, JSON.stringify(result), { EX: 86400 });
          } catch (err) {
            logger.warn('Redis error during idempotency save:', err);
          }
        }

        return result;
      }
    } catch (err) {
      // 1. Rollback reserved stock
      for (const reserved of reservedItems) {
        await Product.findByIdAndUpdate(reserved.productId, { $inc: { stock: reserved.quantity } });
      }

      // 2. Rollback wallet deduction
      if (walletDeducted && user) {
        await User.findByIdAndUpdate(userId, { $inc: { walletBalance: walletDeduction } });
        try {
          await WalletTransaction.create({
            userId: user._id,
            type: 'credit',
            amount: walletDeduction,
            source: 'refund',
            description: `Reversed Siri Cash redemption due to checkout failure`,
            status: 'active'
          });
        } catch (txErr) {
          logger.error('Failed to log wallet refund transaction:', txErr);
        }
      }

      // 3. Rollback User orders push and remove aborted order from DB
      if (order && order._id) {
        try {
          await User.findByIdAndUpdate(userId, { $pull: { orders: order._id } });
          await Order.findByIdAndDelete(order._id);
        } catch (cleanupErr) {
          logger.error('Failed to roll back saved order document:', cleanupErr);
        }
      }

      throw err;
    }
  }

  static async verifyPayment(paymentData: any, userId: string, role: string) {
    const razorpay_order_id = paymentData.razorpay_order_id || paymentData.razorpayOrderId;
    const razorpay_payment_id = paymentData.razorpay_payment_id || paymentData.razorpayPaymentId;
    const razorpay_signature = paymentData.razorpay_signature || paymentData.razorpaySignature;

    if (!razorpay_order_id || !razorpay_payment_id) {
      throw new ApiError(400, 'Missing payment verification parameters');
    }

    if (!razorpay_signature) {
      throw new ApiError(400, 'Missing payment signature verification parameter');
    }

    // 1. Verify Razorpay signature using HMAC SHA256 before doing any DB ops
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      throw new ApiError(500, 'Payment verification is not configured on the server');
    }
    const shasum = crypto.createHmac('sha256', razorpayKeySecret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    const session = await mongoose.startSession();
    session.startTransaction();
    let order: any;

    try {
      // 1. Atomically lock the order in "processing" state to prevent race conditions
      order = await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id, paymentStatus: { $in: ['pending', 'failed', 'processing'] } } as any,
        { $set: { paymentStatus: 'processing' } },
        { new: true, session }
      );

      if (!order) {
        // Check if it's already marked as paid by a webhook or concurrent request
        const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        if (existingOrder && existingOrder.paymentStatus === 'paid') {
          logger.info(`[PAYMENT REDUNDANCY] Payment already processed successfully for order: ${existingOrder._id}`);
          await session.abortTransaction();
          session.endSession();
          return existingOrder;
        }
        throw new ApiError(404, 'Order record not found or cannot be locked for processing');
      }

      if (order.user.toString() !== userId && role !== 'admin') {
        // Rollback lock state
        order.paymentStatus = 'pending';
        await order.save({ session });
        throw new ApiError(403, 'You are not authorized to verify this payment');
      }

      if (digest !== razorpay_signature) {
        // 2. Handle failed payment: Return reserved stock
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity }
          }, { session });
        }

        order.paymentStatus = 'failed';
        order.statusHistory.push({ status: 'Pending', note: 'Payment verification failed (Signature Mismatch) - Stock Released' });
        await order.save({ session });
        await session.commitTransaction();
        session.endSession();
        throw new ApiError(400, 'Invalid payment signature. Payment untrusted.');
      }

      // 3. Mark order as confirmed and paid
      order.paymentStatus = 'paid';
      order.orderStatus = 'Confirmed';
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      order.statusHistory.push({ status: 'Confirmed', note: 'Payment verified and order confirmed' });
      
      await order.save({ session });

      // 4. Clear the user's cart in the database upon successful verification
      await User.findByIdAndUpdate(order.user, { $set: { cart: [] } }, { session });

      // 5. Increment Coupon used count if coupon was active
      if (order.couponCode) {
        await Coupon.findOneAndUpdate(
          { code: order.couponCode.toUpperCase() }, 
          { 
            $inc: { usedCount: 1 },
            $push: { usedBy: { userId: order.user, orderId: order._id } }
          },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

    AnalyticsService.clearCache();
    
    // Trigger Admin Alert, Invoice PDF, and Order Confirmation Email
    try {
      const user = await User.findById(order.user);
      const adminEmails = getAdminEmails();

      // 1. Send Admin Real-time Notification
      await createAdminNotification({
        title: 'New Online Payment Order',
        message: `${user?.name || 'A customer'} placed a new order (₹${order.total}) via Razorpay.`,
        type: 'order',
        actionLink: `/admin/orders/${order._id}`,
      });

      // 2. Generate PDF Invoice
      const pdfBuffer = await generateInvoicePDF({
        orderId: order._id.toString(),
        date: order.createdAt || new Date(),
        customerName: user?.name || 'Customer',
        shippingAddress: typeof order.shippingAddress === 'string' ? order.shippingAddress : order.shippingAddress?.address || '',
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shippingFee,
        total: order.total
      });

      if (user) {
        const frontendUrl = process.env.FRONTEND_URLS?.split(',')[0] || 'http://localhost:5173';
        
        // 3. Compile HTML Template
        const htmlContent = compileTemplate('order-confirmation', {
          customerName: user.name,
          orderId: order._id.toString(),
          orderDate: new Date().toISOString(),
          paymentMethod: 'Online Payment (Razorpay)',
          items: order.items.map((i: any) => ({
            name: i.title,
            variant: i.variant,
            quantity: i.quantity,
            price: i.price,
            image: i.imageSrc
          })),
          subtotal: order.subtotal,
          shipping: order.shippingFee,
          total: order.total,
          shippingAddress: typeof order.shippingAddress === 'string' ? order.shippingAddress : order.shippingAddress?.address || '',
          dashboardUrl: `${frontendUrl}/dashboard?tab=orders`,
          currentYear: new Date().getFullYear(),
        });

        // 4. Send Customer Email
        await sendDirectEmail({
          email: user.email,
          subject: `Order Successfully Placed! ✦ Siri Arts & Crafts [${order._id}]`,
          customHtml: htmlContent,
          type: 'order',
          action: 'order_placed',
          userId: user._id.toString(),
          attachments: [{
            filename: `Invoice_${order.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        });

        // 5. Send Admin Alert Email
        if (adminEmails.length > 0) {
          await sendDirectEmail({
            email: adminEmails[0],
            subject: `New Paid Order Received - ₹${order.total} [${order._id}]`,
            customHtml: htmlContent,
            type: 'system',
            action: 'admin_order_alert',
            attachments: [{
              filename: `Invoice_${order.invoiceNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }]
          });
        }
      }
    } catch (emailErr) {
      logger.error('Failed to dispatch order confirmation email/PDF in background:', emailErr);
    }
    
    logger.info(`Payment successful for order: ${order._id}`);
    return order;
  }

  static async getMyOrders(userId: string) {
    const { limit, skip } = getPaginationOptions({ limit: 100, page: 1 });
    return Order.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  }

  static async getAllOrders(query: any) {
    const { page, limit, skip } = getPaginationOptions(query);
    const { paymentStatus, orderStatus } = query;
    const filter: any = {};
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (orderStatus) filter.orderStatus = orderStatus;

    const [totalCount, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return formatPaginationResponse(orders, totalCount, page, limit);
  }

  static async updateOrderStatus(id: string, status: string, note?: string, courierCharges?: number) {
    const order = await Order.findById(id);
    if (!order) throw new ApiError(404, 'Order not found');

    // Compatibility Mapping for lowercase status strings
    let finalStatus = status;
    if (status === 'placed') finalStatus = 'Pending';
    else if (status === 'confirmed') finalStatus = 'Confirmed';
    else if (status === 'processing') finalStatus = 'Packed';
    else if (status === 'shipped') finalStatus = 'Shipped';
    else if (status === 'delivered') finalStatus = 'Delivered';
    else if (status === 'cancelled') finalStatus = 'Cancelled';
    else if (status === 'settled') finalStatus = 'Settled';

    order.orderStatus = finalStatus as any;

    if (courierCharges !== undefined && courierCharges !== null) {
      order.courierCharges = courierCharges;
    }

    // Automatic COD Remittance Transitions
    if (order.paymentMethod?.toLowerCase() === 'cod') {
      if (finalStatus === 'Delivered') {
        if (!order.codCollected && order.couponCode) {
          await Coupon.findOneAndUpdate(
            { code: order.couponCode.toUpperCase() }, 
            { 
              $inc: { usedCount: 1 },
              $push: { usedBy: { userId: order.user, orderId: order._id } }
            }
          );
        }
        order.codCollected = true;
        order.paymentStatus = 'COD Collected';
        order.settlementStatus = 'Pending';
        if (!order.courierCharges) {
          order.courierCharges = courierCharges !== undefined ? courierCharges : Math.round((order.shippingFee || 120) + 30);
        }
        order.statusHistory.push({ 
          status: 'COD Collected', 
          timestamp: new Date(), 
          note: 'Package delivered. Cash collected by courier agent. Reconciliation pending.' 
        });
      } else if (finalStatus === 'Settled') {
        if (!order.codCollected && order.couponCode) {
          await Coupon.findOneAndUpdate(
            { code: order.couponCode.toUpperCase() }, 
            { 
              $inc: { usedCount: 1 },
              $push: { usedBy: { userId: order.user, orderId: order._id } }
            }
          );
        }
        order.codCollected = true;
        order.paymentStatus = 'paid';
        order.settlementStatus = 'Settled';
        const charges = courierCharges !== undefined ? courierCharges : (order.courierCharges || Math.round((order.shippingFee || 120) + 30));
        order.courierCharges = charges;
        order.settledAmount = Math.max(0, order.total - charges);
        order.earnings = order.settledAmount;
        order.statusHistory.push({ 
          status: 'Settled', 
          timestamp: new Date(), 
          note: `COD Remittance Settled. Received amount: ₹${order.settledAmount} (Total: ₹${order.total} - Courier fee: ₹${charges})` 
        });
      }
    }

    order.statusHistory.push({ status: finalStatus, timestamp: new Date(), note });
    
    // Process Loyalty/Wallet adjustments based on status change
    if (finalStatus === 'Delivered') {
      try {
        await LoyaltyService.processPurchaseRewards(order.user.toString(), order._id.toString(), order.total);
      } catch (rewardsErr) {
        logger.error('Failed to process purchase rewards on delivery:', rewardsErr);
      }
    } else if (finalStatus === 'Cancelled' || finalStatus === 'Returned' || finalStatus === 'Refunded') {
      try {
        await LoyaltyService.reversePurchaseRewards(order._id.toString());
      } catch (reversalErr) {
        logger.error('Failed to reverse purchase rewards on status transition:', reversalErr);
      }

      // Automated Razorpay refund integration for online paid orders
      if (order.paymentStatus === 'paid' && order.razorpayPaymentId && (order.paymentMethod?.toLowerCase() === 'razorpay')) {
        if (razorpay) {
          try {
            logger.info(`[PAYMENT REFUND] Initiating Razorpay automatic refund of ₹${order.total} for order: ${order._id}`);
            const refund = await (razorpay as any).refunds.create({
              payment_id: order.razorpayPaymentId,
              amount: Math.round(order.total * 100), // convert to paise
              speed: 'normal',
              notes: {
                orderId: order._id.toString(),
                reason: `Automatic refund for order status: ${finalStatus}`
              }
            });
            logger.info(`[REFUND SUCCESS] Razorpay refund successful. ID: ${refund.id}`);
            order.paymentStatus = 'refunded';
            order.statusHistory.push({
              status: 'Refunded' as any,
              timestamp: new Date(),
              note: `Razorpay Refund successfully created: ${refund.id}`
            });
          } catch (refundErr: any) {
            logger.error('🏥 [REFUND FAILED] Razorpay API refund failed:', refundErr);
            order.statusHistory.push({
              status: 'Pending' as any,
              timestamp: new Date(),
              note: `Automated Razorpay refund failed: ${refundErr.message || 'API error'}`
            });
          }
        } else {
          logger.warn('[REFUND SIMULATION] Razorpay not configured. Simulating successful refund.');
          order.paymentStatus = 'refunded';
          order.statusHistory.push({
            status: 'Refunded' as any,
            timestamp: new Date(),
            note: 'Simulated payment refund completed successfully'
          });
        }
      }
    }

    await order.save();

    try {
      emitUserEvent(order.user.toString(), 'order_status_updated', {
        orderId: order._id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        note: note || null,
      });
    } catch (socketErr) {
      logger.debug('Could not emit user order status socket event:', socketErr);
    }

    // Trigger Admin Real-time Notification
    try {
      const { createAdminNotification } = require('../controllers/adminNotificationController');
      createAdminNotification({
        title: `Order Status: ${finalStatus}`,
        message: `Order #${order._id} has been updated to ${finalStatus}. ${note || ''}`,
        type: 'order',
        actionLink: `/admin/orders/${order._id}`,
      }).catch((err: any) => {
        logger.error('Failed to create admin notification for order status change (async):', err);
      });
    } catch (notifErr) {
      logger.error('Failed to create admin notification for order status change:', notifErr);
    }

    // Trigger Order Status Email
    try {
      const user = await User.findById(order.user);
      if (user) {
        const frontendUrl = process.env.FRONTEND_URLS?.split(',')[0] || 'http://localhost:3000';
        await sendDirectEmail({
          email: user.email,
          subject: `Order Updated to ${finalStatus.toUpperCase()}! ✦ Siri Arts & Crafts [${order._id}]`,
          customHtml: compileTemplate('order-status', {
            customerName: user.name,
            orderId: order._id.toString(),
            finalStatus: finalStatus.toUpperCase(),
            note: note || 'Your exquisite items are being handled with care.',
            frontendUrl
          }),
          type: 'order',
          action: `order_${finalStatus.toLowerCase().replace(/ /g, '_')}`,
          userId: user._id.toString(),
        });
      }
    } catch (emailErr) {
      logger.error('Failed to dispatch order status update email in background:', emailErr);
    }

    return order;
  }

  static verifyWebhookSignature(signature: string, rawBody: Buffer, webhookSecret: string): boolean {
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(rawBody);
    const digest = shasum.digest('hex');
    const sigBuffer = Buffer.from(signature, 'utf8');
    const digestBuffer = Buffer.from(digest, 'utf8');
    return sigBuffer.length === digestBuffer.length && crypto.timingSafeEqual(sigBuffer, digestBuffer);
  }

  /**
   * Process a verified Razorpay webhook payload (payment capture / failure).
   */
  static async processRazorpayWebhook(event: string, body: any, signature: string) {
    logger.info(`[PAYMENT WEBHOOK] Received verified Razorpay event: ${event}`);

    if (event === 'order.paid' || event === 'payment.captured') {
      const paymentEntity = body.payload?.payment?.entity;
      const razorpay_order_id = paymentEntity?.order_id;
      const razorpay_payment_id = paymentEntity?.id;

      if (razorpay_payment_id) {
        const alreadyPaidByPaymentId = await Order.findOne({
          razorpayPaymentId: razorpay_payment_id,
          paymentStatus: 'paid',
        }).lean();
        if (alreadyPaidByPaymentId) {
          logger.info(
            `[PAYMENT WEBHOOK IDEMPOTENCY] Payment ${razorpay_payment_id} already processed for order ${alreadyPaidByPaymentId._id}`
          );
          return { status: 200, message: 'Webhook idempotency: payment already processed' };
        }
      }

      if (!razorpay_order_id || !razorpay_payment_id) {
        logger.warn('[PAYMENT WEBHOOK] Webhook skipped: Missing order/payment details.');
        return { status: 200, message: 'Skipped: missing entity details' };
      }

      let order: any = await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id, paymentStatus: { $in: ['pending', 'failed', 'processing'] } } as any,
        { $set: { paymentStatus: 'processing' } },
        { new: true }
      );

      if (!order) {
        const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        if (existingOrder?.paymentStatus === 'paid') {
          logger.info(`[PAYMENT WEBHOOK REDUNDANCY] Already paid for order: ${existingOrder._id}`);
          return { status: 200, message: 'Webhook redundancy check: already paid' };
        }
        return { status: 200, message: 'Skipped: Order not found or closed' };
      }

      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        order.paymentStatus = 'paid';
        order.orderStatus = 'Confirmed';
        order.razorpayPaymentId = razorpay_payment_id;
        order.razorpaySignature = signature;
        order.statusHistory.push({
          status: 'Confirmed' as any,
          timestamp: new Date(),
          note: `Payment captured successfully via Razorpay Webhook [Event: ${event}]`,
        });

        await order.save({ session });
        await User.findByIdAndUpdate(order.user, { $set: { cart: [] } }, { session });

        if (order.couponCode) {
          await Coupon.findOneAndUpdate(
            { code: order.couponCode.toUpperCase() },
            { 
              $inc: { usedCount: 1 },
              $push: { usedBy: { userId: order.user, orderId: order._id } }
            },
            { session }
          );
        }

        await session.commitTransaction();
      } catch (dbErr) {
        await session.abortTransaction();
        throw dbErr;
      } finally {
        session.endSession();
      }

      AnalyticsService.clearCache();
      await bumpAdminAnalyticsCacheVersion();

      try {
        const user = await User.findById(order.user);
        if (user) {
          const frontendUrl = process.env.FRONTEND_URLS?.split(',')[0] || 'http://localhost:5173';
          const invoiceBuffer = await generateInvoicePDF({
            orderId: order._id.toString().slice(-8).toUpperCase(),
            date: order.createdAt,
            customerName: user.name,
            shippingAddress: order.shippingAddress?.addressString || '',
            items: order.items.map((i: any) => ({ name: i.title || 'Decor Item', quantity: i.quantity, price: i.price })),
            subtotal: order.subtotal,
            shipping: order.shippingFee,
            total: order.total,
          });

          await sendDirectEmail({
            email: user.email,
            subject: `Order Successfully Placed! ✦ Siri Arts & Crafts [${order._id}]`,
            templateName: 'Order Confirmation',
            templateData: {
              name: user.name,
              orderId: order._id.toString().slice(-8).toUpperCase(),
              totalAmount: order.total.toLocaleString('en-IN'),
              paymentStatus: order.paymentStatus.toUpperCase(),
              shippingAddress: order.shippingAddress,
              frontend_url: frontendUrl,
            },
            attachments: [{
              filename: `Invoice_${order._id.toString().slice(-8).toUpperCase()}.pdf`,
              content: invoiceBuffer,
              contentType: 'application/pdf',
            }],
            type: 'order',
            action: 'order_placed',
            userId: user._id.toString(),
          });

          const adminEmails = getAdminEmails();
          for (const adminEmail of adminEmails) {
            await sendDirectEmail({
              email: adminEmail,
              subject: `New Order Received! ✦ [${order._id}]`,
              templateName: 'Admin System Alert',
              templateData: {
                title: 'New Order Placed',
                message: `Order #${order._id.toString().slice(-8).toUpperCase()} for ₹${order.total.toLocaleString('en-IN')} has been placed by ${user.name}.`,
                actionUrl: `${frontendUrl}/admin/orders/${order._id}`,
              },
              attachments: [{
                filename: `Invoice_${order._id.toString().slice(-8).toUpperCase()}.pdf`,
                content: invoiceBuffer,
                contentType: 'application/pdf',
              }],
              type: 'system',
              action: 'admin_order_notification',
            });
          }
        }
      } catch (emailErr) {
        logger.error('[PAYMENT WEBHOOK EMAIL] Failed to dispatch webhook email:', emailErr);
      }

      logger.info(`[PAYMENT WEBHOOK SUCCESS] Webhook completed cleanly for order: ${order._id}`);
      return { status: 200, message: 'Payment successfully captured via Webhook' };
    }

    if (event === 'payment.failed') {
      const paymentEntity = body.payload?.payment?.entity;
      const razorpay_order_id = paymentEntity?.order_id;
      const errorDescription = paymentEntity?.error_description || 'Unknown transaction error';

      if (razorpay_order_id) {
        const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        if (order && order.paymentStatus === 'pending') {
          const session = await mongoose.startSession();
          session.startTransaction();
          try {
            for (const item of order.items) {
              await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: item.quantity } },
                { session }
              );
            }

            order.paymentStatus = 'failed';
            order.statusHistory.push({
              status: 'Pending' as any,
              timestamp: new Date(),
              note: `Razorpay Transaction Failed: ${errorDescription}. Reserved stock returned.`,
            });
            await order.save({ session });
            await session.commitTransaction();
            logger.warn(`[PAYMENT WEBHOOK FAILURE] Registered payment failure for order: ${order._id}`);
          } catch (err) {
            await session.abortTransaction();
            throw err;
          } finally {
            session.endSession();
          }
        }
      }
    }

    return { status: 200, message: 'Webhook event received but no action required' };
  }
}

export default OrderService;
