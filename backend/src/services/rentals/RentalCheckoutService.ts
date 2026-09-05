import mongoose from 'mongoose';
import Product from '../../models/Product';
import RentalOrder from '../../models/RentalOrder';
import RentalPolicy from '../../models/RentalPolicy';
import ServiceArea from '../../models/ServiceArea';
import ApiError from '../../utils/ApiError';
import logger from '../../config/logger';
import { RazorpayGateway } from '../../utils/payment/RazorpayGateway';
import { DistributedLock } from '../../utils/DistributedLock';
import { RentalAvailabilityService } from './RentalAvailabilityService';
import OutboxEvent from '../../models/OutboxEvent';
import storeSettingsService from '../StoreSettingsService';
import PaymentAttempt from '../../models/PaymentAttempt';
import User from '../../models/User';
import WalletTransaction from '../../models/WalletTransaction';
import { debitWalletBalance } from '../../utils/payment/walletMutations';

export class RentalCheckoutService {
  static async calculateRentalCost(
    productId: string,
    startDate: Date,
    endDate: Date,
    quantity: number = 1,
  ) {
    const qty = Math.max(1, Number(quantity) || 1);
    const product = await Product.findById(productId).lean();
    if (!product) throw new ApiError(404, 'Product not found');
    if (!product.rentalEnabled) throw new ApiError(400, 'This product is not available for rent');

    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (start < now) throw new ApiError(400, 'Rental start date cannot be in the past');
    if (end <= start) throw new ApiError(400, 'End date must be after start date');

    const durationMs = end.getTime() - start.getTime();
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

    if (durationDays < product.rentalMinDays) {
      throw new ApiError(400, `Minimum rental duration is ${product.rentalMinDays} day(s)`);
    }
    if (durationDays > product.rentalMaxDays) {
      throw new ApiError(400, `Maximum rental duration is ${product.rentalMaxDays} day(s)`);
    }

    const pricing = product.rentalPricing;
    if (!pricing || !pricing.rentalPrice || pricing.rentalPrice <= 0) {
      throw new ApiError(400, 'No rental pricing configured for this product');
    }

    const packageDurationDays = pricing.rentalDurationDays || 1;
    const minDays = Math.max(1, product.rentalMinDays || 1);
    if (durationDays < minDays) {
      throw new ApiError(400, `Minimum rental duration is ${minDays} day(s)`);
    }
    if (durationDays > packageDurationDays) {
      throw new ApiError(
        400,
        `Rental duration cannot exceed ${packageDurationDays} day(s) for this package (up to ${packageDurationDays} days)`,
      );
    }

    const baseRentalCharge = Math.round(pricing.rentalPrice * 100) / 100;
    const rentalCharge = Math.round(baseRentalCharge * qty * 100) / 100;

    const settings = await storeSettingsService.getSettings();
    const securityDeposit = Math.round((product.securityDeposit || 0) * qty * 100) / 100;
    const isFreeShipping =
      (settings.shipping.enableFreeShipping &&
        rentalCharge > settings.shipping.freeShippingThreshold) ||
      rentalCharge === 0;
    const deliveryCharge = isFreeShipping ? 0 : settings.shipping.deliveryCharge;

    const gstEnabled = settings.taxes.gstEnabled;
    const taxInclusive = settings.taxes.taxInclusive !== false;
    const taxRate = settings.taxes.gstRate || 0.18;
    let tax: number;
    let totalAmount: number;

    if (!gstEnabled) {
      tax = 0;
      totalAmount = Math.round((rentalCharge + securityDeposit + deliveryCharge) * 100) / 100;
    } else if (taxInclusive) {
      const taxableAmount = Math.round((rentalCharge / (1 + taxRate)) * 100) / 100;
      tax = Math.round((rentalCharge - taxableAmount) * 100) / 100;
      totalAmount = Math.round((rentalCharge + securityDeposit + deliveryCharge) * 100) / 100;
    } else {
      tax = Math.round(rentalCharge * taxRate * 100) / 100;
      totalAmount = Math.round((rentalCharge + securityDeposit + deliveryCharge + tax) * 100) / 100;
    }

    return {
      productId: product._id,
      productTitle: product.title,
      quantity: qty,
      durationDays,
      packageDurationDays,
      rentalRate: {
        rentalPrice: pricing.rentalPrice,
        rentalDurationDays: packageDurationDays,
      },
      rentalCharge,
      securityDeposit,
      isDepositRefundable: product.isDepositRefundable,
      deliveryCharge,
      tax,
      taxInclusive,
      totalAmount,
      startDate: start,
      endDate: end,
    };
  }

  static haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const toRadians = (deg: number) => deg * (Math.PI / 180);
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static async checkServiceArea(lat: number, lng: number) {
    const serviceAreas = await ServiceArea.find({ isActive: true }).lean();
    if (serviceAreas.length === 0) return { eligible: true, message: 'Delivery available' };
    for (const area of serviceAreas) {
      const distance = this.haversineDistance(lat, lng, area.center.lat, area.center.lng);
      if (distance <= area.radiusKm) {
        return {
          eligible: true,
          message: `Delivery available from ${area.name}`,
          serviceArea: area.name,
          distanceKm: Math.round(distance * 10) / 10,
        };
      }
    }
    return { eligible: false, message: 'Sorry, rental delivery is not available in your area' };
  }

  static async createRentalOrder(data: any, userId: string) {
    const {
      productId,
      quantity = 1,
      rentalStartDate,
      rentalEndDate,
      shippingAddress,
      identityDocuments,
      aadhaarNumber,
      agreementAccepted,
      paymentMethod,
      useWallet,
    } = data;

    const qty = Math.max(1, Number(quantity) || 1);
    const costBreakdown = await this.calculateRentalCost(
      productId,
      rentalStartDate,
      rentalEndDate,
      qty,
    );
    const availability = await RentalAvailabilityService.checkAvailability(
      productId,
      rentalStartDate,
      rentalEndDate,
    );
    if (!availability.available)
      throw new ApiError(400, availability.reason || 'Product not available for selected dates');

    const activeServiceAreas = await ServiceArea.countDocuments({ isActive: true });
    if (activeServiceAreas > 0) {
      if (!shippingAddress.latitude || !shippingAddress.longitude)
        throw new ApiError(400, 'Delivery coordinates are required');
      const serviceCheck = await this.checkServiceArea(
        shippingAddress.latitude,
        shippingAddress.longitude,
      );
      if (!serviceCheck.eligible) throw new ApiError(400, serviceCheck.message);
    }

    const policy = await RentalPolicy.findOne({ isActive: true }).lean();
    if (policy?.identityVerificationRequired) {
      if (!identityDocuments || identityDocuments.length === 0)
        throw new ApiError(400, 'Identity documents required');
    }
    if (!agreementAccepted) throw new ApiError(400, 'Rental agreement must be accepted');

    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

    const startDateStr = new Date(rentalStartDate).toISOString().split('T')[0];
    const endDateStr = new Date(rentalEndDate).toISOString().split('T')[0];
    const lockKey = `rental_booking_${productId}_${startDateStr}_${endDateStr}`;
    const isCod = paymentMethod === 'cod';

    return await DistributedLock.withLock(
      lockKey,
      async () => {
        const session = await mongoose.startSession();
        session.startTransaction();
        let rentalOrder;
        const pendingOrderId = new mongoose.Types.ObjectId();

        const userDoc = await User.findById(userId).session(session);
        const availableWallet = userDoc?.walletBalance || 0;
        const settings = await storeSettingsService.getSettings();

        const grossAmount = costBreakdown.totalAmount;
        let walletDeduction = 0;
        if (useWallet && settings.loyalty?.walletEnabled) {
          walletDeduction = Math.min(grossAmount, availableWallet);
        }
        const finalAmount = Math.round((grossAmount - walletDeduction) * 100) / 100;
        const isInstantWallet = !isCod && finalAmount === 0 && walletDeduction > 0;
        const isDirectOrder = isCod || isInstantWallet;

        try {
          const availabilityCheck = await RentalAvailabilityService.checkAvailability(
            productId,
            costBreakdown.startDate,
            costBreakdown.endDate,
            session,
          );
          if (!availabilityCheck.available)
            throw new ApiError(400, availabilityCheck.reason || 'Product fully booked');

          if (isDirectOrder) {
            if (walletDeduction > 0) {
              const updatedUser = await debitWalletBalance(userId, walletDeduction, session);
              if (!updatedUser) throw new ApiError(400, 'Insufficient wallet balance.');
              await WalletTransaction.create(
                [
                  {
                    userId,
                    type: 'debit',
                    amount: walletDeduction,
                    source: 'checkout_redeem',
                    description: 'Redeemed Siri Cash at rental checkout',
                  },
                ],
                { session },
              );
            }

            const rentalOrders = await RentalOrder.create(
              [
                {
                  _id: pendingOrderId,
                  user: userId,
                  product: productId,
                  quantity: qty,
                  productTitle: product.title,
                  productImage: product.imageSrc,
                  rentalStartDate: costBreakdown.startDate,
                  rentalEndDate: costBreakdown.endDate,
                  durationDays: costBreakdown.durationDays,
                  rentalRate: costBreakdown.rentalRate,
                  rentalCharge: costBreakdown.rentalCharge,
                  securityDeposit: costBreakdown.securityDeposit,
                  deliveryCharge: costBreakdown.deliveryCharge,
                  tax: costBreakdown.tax,
                  walletDeduction,
                  totalAmount: finalAmount,
                  status: 'confirmed',
                  paymentMethod: isInstantWallet ? 'wallet' : 'cod',
                  paymentStatus: isInstantWallet ? 'paid' : 'Pending COD',
                  shippingAddress,
                  identityDocuments: identityDocuments || [],
                  aadhaarNumber: aadhaarNumber || '',
                  agreementAcceptedAt: new Date(),
                  statusHistory: [
                    {
                      status: 'confirmed',
                      note: isInstantWallet
                        ? 'Rental order fully paid with Siri Pay wallet'
                        : 'Rental COD order placed',
                    },
                  ],
                },
              ],
              { session },
            );
            rentalOrder = rentalOrders[0];

            // NATIVE MONGODB LOCKING (Permanent for COD)
            await RentalAvailabilityService.lockDates(
              productId,
              rentalOrder._id.toString(),
              availabilityCheck.unitNumber as number,
              availabilityCheck.requestedDates as string[],
              session,
              false,
            );

            await OutboxEvent.create(
              [
                {
                  aggregateId: rentalOrder._id.toString(),
                  aggregateType: 'RentalOrder',
                  eventType: 'RentalCreated',
                  payload: { orderId: rentalOrder._id.toString(), userId, type: 'cod' },
                },
              ],
              { session },
            );

            await session.commitTransaction();

            try {
              const { emitAdminEvent } = require('../../socket');
              emitAdminEvent('rental_update', { rentalId: rentalOrder._id });
            } catch (e) {
              logger.debug('Failed to emit rental_update event', e);
            }

            session.endSession();

            return { rentalOrder };
          } else {
            // FOR RAZORPAY: Just lock dates temporarily, do not create RentalOrder yet
            await RentalAvailabilityService.lockDates(
              productId,
              pendingOrderId.toString(),
              availabilityCheck.unitNumber as number,
              availabilityCheck.requestedDates as string[],
              session,
              true, // isTemporary
            );

            await session.commitTransaction();
            session.endSession();
          }
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          throw error;
        }

        // ENTERPRISE FIX: Create Razorpay order AFTER DB commit (with temp dates locked)
        let razorpayOrder;
        try {
          const { razorpayCircuitBreaker } = require('../../utils/CircuitBreaker');
          razorpayOrder = await razorpayCircuitBreaker.execute(() =>
            RazorpayGateway.createOrder({
              amount: Math.round(finalAmount * 100),
              currency: 'INR',
              receipt: `rental_${pendingOrderId}`,
              notes: { type: 'rental', productId, userId },
            }),
          );
        } catch (err) {
          logger.error('Razorpay rental order creation failed:', err);
          // Auto-release the lock since payment failed to initiate
          await RentalAvailabilityService.releaseDates(pendingOrderId.toString());
          throw new ApiError(502, 'Payment gateway temporarily unavailable. Please try again.');
        }

        const attemptData = {
          pendingOrderId,
          userId,
          product: productId,
          quantity: qty,
          productTitle: product.title,
          productImage: product.imageSrc,
          rentalStartDate: costBreakdown.startDate,
          rentalEndDate: costBreakdown.endDate,
          durationDays: costBreakdown.durationDays,
          rentalRate: costBreakdown.rentalRate,
          rentalCharge: costBreakdown.rentalCharge,
          securityDeposit: costBreakdown.securityDeposit,
          deliveryCharge: costBreakdown.deliveryCharge,
          tax: costBreakdown.tax,
          walletDeduction,
          total: finalAmount,
          totalAmount: finalAmount,
          paymentMethod: 'razorpay',
          shippingAddress,
          identityDocuments: identityDocuments || [],
          aadhaarNumber: aadhaarNumber || '',
          agreementAcceptedAt: new Date(),
        };

        await PaymentAttempt.create({
          razorpayOrderId: razorpayOrder.id,
          userId: userId,
          type: 'rental',
          status: 'initiated',
          orderData: attemptData,
        });

        return {
          rentalOrder: { _id: pendingOrderId, total: finalAmount, totalAmount: finalAmount },
          razorpayOrderId: razorpayOrder.id,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID,
          amount: Math.round(finalAmount * 100),
        };
      },
      45,
    );
  }

  static async verifyRentalPayment(paymentData: any, userId: string) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;
    const crypto = require('crypto');

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) throw new ApiError(500, 'Payment verification not configured');

    const shasum = crypto.createHmac('sha256', razorpayKeySecret);
    shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const digest = shasum.digest('hex');
    const expected = Buffer.from(digest, 'utf8');
    const received = Buffer.from(razorpaySignature || '', 'utf8');
    const isSignatureValid =
      expected.length === received.length && crypto.timingSafeEqual(expected, received);

    // Cross-check with Razorpay API (enterprise security requirement)

    let fetchedPayment: any = null;
    try {
      fetchedPayment = await RazorpayGateway.getPayment(razorpayPaymentId);
    } catch (err: any) {
      logger.error(`[RENTAL] Failed to fetch payment ${razorpayPaymentId} from Razorpay:`, err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    let order;
    try {
      order = await RentalOrder.findOneAndUpdate(
        {
          razorpayOrderId,
          paymentStatus: { $in: ['pending', 'failed'] },
        },
        { $set: { paymentStatus: 'processing' } },
        { returnDocument: 'after', session },
      );

      if (!order) {
        const existing = await RentalOrder.findOne({ razorpayOrderId }).session(session);
        if (existing?.paymentStatus === 'paid') {
          await session.abortTransaction();
          session.endSession();
          return existing;
        }
        if (existing?.paymentStatus === 'processing') {
          await session.abortTransaction();
          session.endSession();
          // Poll for up to 5 seconds
          for (let i = 0; i < 10; i++) {
            await new Promise((res) => setTimeout(res, 500));
            const checkOrder = await RentalOrder.findOne({ razorpayOrderId });
            if (checkOrder?.paymentStatus === 'paid') return checkOrder;
            if (checkOrder?.paymentStatus === 'failed')
              throw new ApiError(400, 'Payment validation failed concurrently');
          }
          throw new ApiError(
            409,
            'Payment is still being processed. Please check back in a few seconds.',
          );
        }
        throw new ApiError(404, 'Rental order not found or cannot be locked for processing');
      }

      if (order.user.toString() !== userId) {
        order.paymentStatus = 'pending';
        await order.save({ session });
        throw new ApiError(403, 'Not authorized');
      }

      // Full validation: signature + Razorpay API cross-check
      let isAmountValid = true;
      let isCurrencyValid = true;
      let isStatusValid = true;
      if (fetchedPayment) {
        const expectedAmount = Math.round(order.totalAmount * 100);
        isAmountValid = fetchedPayment.amount === expectedAmount;
        isCurrencyValid = fetchedPayment.currency === 'INR';
        isStatusValid =
          fetchedPayment.status === 'captured' || fetchedPayment.status === 'authorized';
      }
      const isValid = isSignatureValid && isAmountValid && isCurrencyValid && isStatusValid;

      // PaymentAudit entry
      const PaymentAudit = require('../../models/PaymentAudit').default;
      await PaymentAudit.create(
        [
          {
            orderId: order._id,
            userId: userId,
            razorpayOrderId: razorpayOrderId,
            razorpayPaymentId: razorpayPaymentId,
            eventType: 'verification_attempt',
            status: isValid ? 'success' : 'failed',
            amountExpected: Math.round(order.totalAmount * 100),
            amountReceived: fetchedPayment ? Number(fetchedPayment.amount) : undefined,
            currencyReceived: fetchedPayment ? String(fetchedPayment.currency) : undefined,
            signatureValid: isSignatureValid,
            notes: `Rental payment verification. Signature: ${isSignatureValid}, Amount: ${isAmountValid}, Currency: ${isCurrencyValid}, Status: ${fetchedPayment?.status || 'unknown'}`,
            rawPayload: fetchedPayment ? JSON.stringify(fetchedPayment) : undefined,
          },
        ],
        { session },
      );

      if (!isValid) {
        await RentalAvailabilityService.releaseDates(order._id.toString(), session);
        order.paymentStatus = 'failed';
        order.statusHistory.push({
          status: 'pending',
          note: `Payment verification failed. Signature: ${isSignatureValid}, Amount: ${isAmountValid}`,
        } as any);
        await order.save({ session });

        await OutboxEvent.create(
          [
            {
              aggregateId: order._id.toString(),
              aggregateType: 'RentalOrder',
              eventType: 'RentalPaymentFailed',
              payload: { orderId: order._id.toString() },
            },
          ],
          { session },
        );

        await session.commitTransaction();
        session.endSession();
        throw new ApiError(400, 'Payment verification failed');
      }

      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      order.razorpayPaymentId = razorpayPaymentId;
      order.razorpaySignature = razorpaySignature;
      order.statusHistory.push({
        status: 'confirmed',
        note: 'Payment verified and rental order confirmed',
      } as any);
      await order.save({ session });

      await OutboxEvent.create(
        [
          {
            aggregateId: order._id.toString(),
            aggregateType: 'RentalOrder',
            eventType: 'RentalCreated',
            payload: { orderId: order._id.toString(), userId, type: 'online' },
          },
        ],
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      logger.info(`[RENTAL] Payment verified for rental order: ${order.rentalOrderId}`);
      return order;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}
