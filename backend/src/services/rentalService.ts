import mongoose from 'mongoose';
import Product from '../models/Product';
import RentalOrder from '../models/RentalOrder';
import RentalCalendar from '../models/RentalCalendar';
import RentalPolicy from '../models/RentalPolicy';
import RentalInspection from '../models/RentalInspection';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { formatPaginationResponse } from '../utils/pagination';
import { RentalAvailabilityService } from './rentals/RentalAvailabilityService';
import { RentalStateMachine } from './rentals/RentalStateMachine';
import { PaymentRefundService } from './PaymentRefundService';
import { RentalCheckoutService } from './rentals/RentalCheckoutService';
import AuthIdentity from '../models/AuthIdentity';

class RentalService {
  static async checkAvailability(productId: string, startDate: Date, endDate: Date) {
    return await RentalAvailabilityService.checkAvailability(productId, startDate, endDate);
  }

  static async calculateRentalCost(
    productId: string,
    startDate: Date,
    endDate: Date,
    quantity: number = 1,
  ) {
    return await RentalCheckoutService.calculateRentalCost(productId, startDate, endDate, quantity);
  }

  static async checkServiceArea(lat: number, lng: number) {
    return await RentalCheckoutService.checkServiceArea(lat, lng);
  }

  static async createRentalOrder(data: any, userId: string) {
    return await RentalCheckoutService.createRentalOrder(data, userId);
  }

  static async verifyRentalPayment(paymentData: any, userId: string) {
    return await RentalCheckoutService.verifyRentalPayment(paymentData, userId);
  }

  /**
   * Get customer's rental orders.
   */
  static async getMyRentals(userId: string, queryParams: any) {
    const { status, page = 1, limit = 10 } = queryParams;
    const filter: any = {
      user: userId,
      $or: [
        { paymentMethod: 'cod' },
        { paymentStatus: { $nin: ['pending', 'processing', 'failed'] } },
      ],
    };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [rentals, total] = await Promise.all([
      RentalOrder.find(filter)
        .populate({
          path: 'product',
          select: 'primaryCategory',
          populate: { path: 'primaryCategory', select: 'name' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      RentalOrder.countDocuments(filter),
    ]);

    return formatPaginationResponse(rentals, total, Number(page), Number(limit));
  }

  /**
   * Get single rental order detail.
   */
  static async getRentalDetail(rentalId: string, userId?: string) {
    const isObjectId = mongoose.isValidObjectId(rentalId);
    const filter: any = isObjectId
      ? { $or: [{ _id: rentalId }, { rentalOrderId: rentalId }] }
      : { rentalOrderId: rentalId };
    if (userId) filter.user = userId; // Non-admin users can only see their own

    const rental = await RentalOrder.findOne(filter)
      .populate('product', 'title imageSrc images price rentalPricing rentalEnabled')
      .populate('user', 'name email phone avatar role isVerified googleId createdAt')
      .lean();

    if (!rental) throw new ApiError(404, 'Rental order not found');

    if (rental.user && (rental.user as any)._id) {
      const identities = await AuthIdentity.find({ userId: (rental.user as any)._id }).lean();
      const hasEmailAuth = identities.some(
        (i) => i.provider === 'email' || i.provider === 'google',
      );
      const hasPhoneAuth = identities.some((i) => i.provider === 'phone');

      (rental.user as any).isEmailVerified = Boolean(
        hasEmailAuth ||
        ((rental.user as any).isVerified &&
          Boolean((rental.user as any).email || (rental.user as any).googleId)),
      );
      (rental.user as any).isPhoneVerified = Boolean(hasPhoneAuth);
    }

    return rental;
  }

  /**
   * Get all rental orders (admin).
   */
  static async getAllRentals(queryParams: any) {
    const { status, search, page = 1, limit = 20 } = queryParams;
    const filter: any = {};

    if (status) filter.status = status;
    if (queryParams.paymentStatus) filter.paymentStatus = queryParams.paymentStatus;

    if (search) {
      filter.$or = [
        { rentalOrderId: new RegExp(search, 'i') },
        { productTitle: new RegExp(search, 'i') },
        { 'shippingAddress.name': new RegExp(search, 'i') },
        { 'shippingAddress.email': new RegExp(search, 'i') },
        { 'shippingAddress.phone': new RegExp(search, 'i') },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [rentals, total] = await Promise.all([
      RentalOrder.find(filter)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      RentalOrder.countDocuments(filter),
    ]);

    return formatPaginationResponse(rentals, total, Number(page), Number(limit));
  }

  /**
   * Update rental order status (admin).
   */
  static async updateRentalStatus(rentalId: string, status: string, note: string, adminId: string) {
    const rental = await RentalOrder.findById(rentalId);
    if (!rental) throw new ApiError(404, 'Rental order not found');

    if (status === 'delivered') {
      status = 'active_rental';
      note = note || 'Rental period started (marked as delivered)';
    }

    const oldStatus = rental.status;
    RentalStateMachine.transition(rental, status as any, note, adminId);
    await rental.save();

    const OutboxEvent = require('../models/OutboxEvent').default;
    await OutboxEvent.create({
      aggregateId: rental._id.toString(),
      aggregateType: 'RentalOrder',
      eventType: 'RentalStatusUpdated',
      payload: { oldStatus, newStatus: status, orderId: rental._id.toString() },
    });

    logger.info(`[RENTAL] Status updated to ${status} for ${rental.rentalOrderId} by ${adminId}`);
    return rental;
  }

  /**
   * Customer requests return.
   */
  static async requestReturn(rentalId: string, userId: string) {
    const rental = await RentalOrder.findOne({ _id: rentalId, user: userId });
    if (!rental) throw new ApiError(404, 'Rental order not found');

    const returnableStatuses = ['active_rental', 'late_return'];
    if (!returnableStatuses.includes(rental.status)) {
      throw new ApiError(400, `Cannot request return when status is "${rental.status}"`);
    }

    RentalStateMachine.transition(
      rental,
      'return_requested',
      'Customer requested product return',
      userId,
    );
    rental.returnRequestedAt = new Date();

    await rental.save();
    return rental;
  }

  /**
   * Process return with inspection (admin).
   */
  static async processReturn(rentalId: string, inspectionData: any, adminId: string) {
    const rental = await RentalOrder.findById(rentalId);
    if (!rental) throw new ApiError(404, 'Rental order not found');

    const product = await Product.findById(rental.product);
    if (!product) throw new ApiError(404, 'Product not found');

    const policy = await RentalPolicy.findOne({ isActive: true }).lean();

    // Calculate penalties based on condition and policy
    let penaltyAmount = 0;
    let depositDeduction = 0;
    let refundAmount = rental.securityDeposit;

    const { condition, notes, images } = inspectionData;

    switch (condition) {
      case 'excellent':
      case 'good':
        // Full deposit refund
        break;
      case 'minor_damage':
        penaltyAmount = policy?.damagePolicy?.minor || 200;
        depositDeduction = Math.min(penaltyAmount, rental.securityDeposit);
        refundAmount = rental.securityDeposit - depositDeduction;
        break;
      case 'major_damage':
        penaltyAmount = policy?.damagePolicy?.major || 1000;
        depositDeduction = Math.min(penaltyAmount, rental.securityDeposit);
        refundAmount = rental.securityDeposit - depositDeduction;
        break;
      case 'lost':
        if (policy?.lostProductPolicy?.type === 'percentage') {
          penaltyAmount = product.price * (policy.lostProductPolicy.percentage / 100);
        } else {
          penaltyAmount = product.price;
        }
        depositDeduction = rental.securityDeposit;
        refundAmount = 0;
        break;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create inspection record
      await RentalInspection.create(
        [
          {
            rentalOrder: rental._id,
            product: rental.product,
            condition,
            refundAmount,
            penaltyAmount,
            depositDeduction,
            inspectedBy: adminId,
            notes,
            images: images || [],
          },
        ],
        { session },
      );

      // Update rental order
      rental.actualReturnDate = new Date();
      rental.inspectionResult = {
        condition,
        refundAmount,
        penaltyAmount,
        depositDeduction,
        inspectedBy: adminId,
        notes,
        images: images || [],
        inspectedAt: new Date(),
      };

      RentalStateMachine.transition(
        rental,
        'returned',
        `Item returned and inspected. Condition: ${condition}`,
        adminId,
      );

      await rental.save({ session });

      // If product is lost, reduce the physical rentalStock capacity
      if (condition === 'lost') {
        await Product.findByIdAndUpdate(rental.product, { $inc: { rentalStock: -1 } }, { session });
      }

      // Release calendar block
      await RentalCalendar.findOneAndUpdate(
        { rentalOrder: rental._id },
        { status: 'returned' },
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      return rental;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Release security deposit (admin).
   */
  static async releaseDeposit(
    rentalId: string,
    data: { deductionAmount: number; deductionReason?: string; method: string },
    adminId: string,
  ) {
    const { deductionAmount, deductionReason, method } = data;
    const rental = await RentalOrder.findById(rentalId);
    if (!rental) throw new ApiError(404, 'Rental order not found');

    if (rental.depositRefund) {
      throw new ApiError(400, 'Deposit has already been refunded for this order');
    }

    if (rental.status !== 'returned') {
      throw new ApiError(400, 'Deposit can only be released after the product is returned');
    }

    if (rental.depositStatus !== 'held') {
      throw new ApiError(400, 'Deposit is not currently held');
    }

    if (deductionAmount < 0 || deductionAmount > rental.securityDeposit) {
      throw new ApiError(400, 'Invalid deduction amount');
    }

    const refundAmount = rental.securityDeposit - deductionAmount;

    if (method === 'razorpay') {
      if (!rental.razorpayPaymentId) {
        throw new ApiError(400, 'Cannot refund via Razorpay: no original Razorpay payment found');
      }
      // Note: We don't fetch original payment amount here, we trust the checkout flow
      // which puts the whole totalAmount into the Razorpay order.
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (refundAmount === 0) {
        // Full forfeiture
        rental.depositRefund = {
          amount: 0,
          date: new Date(),
          reason: deductionReason || 'Full deposit forfeited',
          processedBy: adminId,
          method: 'none',
          status: 'completed',
        };
        rental.depositStatus = 'forfeited';

        RentalStateMachine.transition(
          rental,
          'completed',
          `Deposit fully forfeited. Reason: ${deductionReason}`,
          adminId,
        );

        await rental.save({ session });

        const OutboxEvent = require('../models/OutboxEvent').default;
        await OutboxEvent.create(
          [
            {
              aggregateId: rental._id.toString(),
              aggregateType: 'RentalOrder',
              eventType: 'RentalDepositForfeited',
              payload: { orderId: rental._id.toString() },
            },
          ],
          { session },
        );
      } else if (method === 'cash') {
        rental.depositRefund = {
          amount: refundAmount,
          date: new Date(),
          reason: deductionReason ? `Deduction: ${deductionReason}` : 'Full refund',
          processedBy: adminId,
          method: 'cash',
          status: 'completed',
        };
        rental.depositStatus = 'refunded';

        RentalStateMachine.transition(
          rental,
          'completed',
          `Deposit of ₹${refundAmount} released via Cash. ${deductionReason ? 'Deduction: ' + deductionReason : ''}`,
          adminId,
        );

        await rental.save({ session });

        const OutboxEvent = require('../models/OutboxEvent').default;
        await OutboxEvent.create(
          [
            {
              aggregateId: rental._id.toString(),
              aggregateType: 'RentalOrder',
              eventType: 'RentalDepositRefunded',
              payload: { orderId: rental._id.toString() },
            },
          ],
          { session },
        );
      } else if (method === 'razorpay') {
        rental.depositRefund = {
          amount: refundAmount,
          date: new Date(),
          reason: deductionReason ? `Deduction: ${deductionReason}` : 'Full refund',
          processedBy: adminId,
          method: 'razorpay',
          status: 'processing',
        };
        rental.depositStatus = 'processing';

        await rental.save({ session });

        // Note: we do NOT transition to completed yet.

        const OutboxEvent = require('../models/OutboxEvent').default;
        await OutboxEvent.create(
          [
            {
              aggregateId: rental._id.toString(),
              aggregateType: 'RentalOrder',
              eventType: 'RentalDepositRefundInitiated',
              payload: { orderId: rental._id.toString() },
            },
          ],
          { session },
        );

        // Initiate actual Razorpay refund for the deposit amount (async)
        try {
          await PaymentRefundService.initiateAsyncRefund({
            amount: refundAmount,
            currency: 'INR',
            originalTransactionId: rental.razorpayPaymentId as string,
            entityType: 'Rental',
            entityId: rental._id,
          });
          logger.info(
            `[RENTAL] Razorpay deposit refund of ₹${refundAmount} initiated for ${rental.rentalOrderId}`,
          );
        } catch (refundErr: any) {
          logger.error(
            `[CRITICAL] Failed to enqueue Razorpay deposit refund for rental ${rental._id}:`,
            refundErr,
          );
          throw new ApiError(500, 'Failed to initiate refund process');
        }
      }

      await session.commitTransaction();
      session.endSession();

      logger.info(
        `[RENTAL] Deposit ₹${refundAmount} released/processed for ${rental.rentalOrderId} by ${adminId}`,
      );
      return rental;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Get product availability calendar data (admin).
   */
  static async getProductCalendar(productId: string, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month ?? now.getMonth();
    const targetYear = year ?? now.getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const filter: any = {
      status: 'booked',
      $or: [{ startDate: { $lte: endOfMonth }, endDate: { $gte: startOfMonth } }],
    };
    if (productId) {
      filter.product = productId;
    }

    const bookings = await RentalCalendar.find(filter)
      .populate('rentalOrder', 'rentalOrderId user productTitle status durationDays')
      .sort({ startDate: 1 })
      .lean();

    let product = null;
    if (productId) {
      product = await Product.findById(productId).select('title rentalStock rentalEnabled').lean();
    }

    return { product, bookings, month: targetMonth, year: targetYear };
  }

  /**
   * Cancel a rental order.
   */
  static async cancelRentalOrder(rentalId: string, userId: string, isAdmin: boolean = false) {
    const filter: any = { _id: rentalId };
    if (!isAdmin) filter.user = userId;

    const rental = await RentalOrder.findOne(filter);
    if (!rental) throw new ApiError(404, 'Rental order not found');

    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(rental.status)) {
      throw new ApiError(400, `Cannot cancel when status is "${rental.status}"`);
    }

    const policy = await RentalPolicy.findOne({ isActive: true }).lean();
    let refundPercent = 100;

    if (rental.status === 'confirmed' && rental.paymentStatus === 'paid' && policy) {
      const hoursSinceConfirm = (Date.now() - rental.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceConfirm > (policy.cancellationPolicy?.freeCancelHours || 24)) {
        refundPercent = 100 - (policy.cancellationPolicy?.postConfirmChargePercent || 50);
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // (Stock is not incremented since it was never decremented globally)

      // Release calendar block
      await RentalCalendar.findOneAndUpdate(
        { rentalOrder: rental._id },
        { status: 'cancelled' },
        { session },
      );

      RentalStateMachine.transition(
        rental,
        'cancelled',
        `Order cancelled. Refund: ${refundPercent}%`,
        isAdmin ? 'admin' : userId,
      );
      await rental.save({ session });

      if (rental.paymentStatus === 'paid' && refundPercent > 0 && rental.razorpayPaymentId) {
        const refundAmount = (rental.totalAmount * refundPercent) / 100;
        await PaymentRefundService.initiateAsyncRefund({
          amount: Math.min(refundAmount, rental.totalAmount),
          currency: 'INR',
          originalTransactionId: rental.razorpayPaymentId,
          entityType: 'Rental',
          entityId: rental._id,
        }).catch((err: any) => {
          logger.error(
            `[CRITICAL] Failed to enqueue refund for rental cancellation: ${rental._id}`,
            err,
          );
        });
      }

      await session.commitTransaction();
      session.endSession();

      return { rental, refundPercent };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Apply late fees to overdue rental orders (called by cron).
   */
  static async applyLateFees() {
    const policy = await RentalPolicy.findOne({ isActive: true }).lean();
    if (!policy) return { processed: 0 };

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const overdueRentals = await RentalOrder.find({
      status: 'active_rental',
      rentalEndDate: { $lt: now },
      paymentStatus: 'paid',
    });

    let processed = 0;
    for (const rental of overdueRentals) {
      const overdueDays = Math.ceil(
        (now.getTime() - new Date(rental.rentalEndDate).getTime()) / (1000 * 60 * 60 * 24),
      );

      if (overdueDays > rental.lateFeeAppliedDays) {
        const newDays = overdueDays - rental.lateFeeAppliedDays;
        const additionalFee = newDays * policy.lateReturnFeePerDay;

        rental.lateFee += additionalFee;
        rental.lateFeeAppliedDays = overdueDays;
        rental.status = 'late_return';

        if (rental.statusHistory[rental.statusHistory.length - 1]?.status !== 'late_return') {
          rental.statusHistory.push({
            status: 'late_return',
            note: `Late fee of ₹${additionalFee} applied (${newDays} day(s) overdue)`,
            performedBy: 'system',
          } as any);
        }

        await rental.save();
        processed++;
        logger.info(`[RENTAL CRON] Late fee ₹${additionalFee} applied to ${rental.rentalOrderId}`);
      }
    }

    return { processed };
  }

  /**
   * Get rental analytics summary (admin).
   */
  static async getRentalAnalytics() {
    const [
      totalRentals,
      activeRentals,
      overdueRentals,
      completedRentals,
      totalRevenue,
      totalDepositsHeld,
    ] = await Promise.all([
      RentalOrder.countDocuments(),
      RentalOrder.countDocuments({ status: 'active_rental' }),
      RentalOrder.countDocuments({ status: 'late_return' }),
      RentalOrder.countDocuments({ status: 'completed' }),
      RentalOrder.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$rentalCharge' } } },
      ]),
      RentalOrder.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
            status: {
              $in: [
                'confirmed',
                'packed',
                'out_for_delivery',
                'delivered',
                'active_rental',
                'late_return',
                'return_requested',
              ],
            },
          },
        },
        { $group: { _id: null, total: { $sum: '$securityDeposit' } } },
      ]),
    ]);

    return {
      totalRentals,
      activeRentals,
      overdueRentals,
      completedRentals,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalDepositsHeld: totalDepositsHeld[0]?.total || 0,
    };
  }

  /**
   * Get due returns (admin).
   */
  static async getDueReturns() {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const [dueToday, overdue, upcoming] = await Promise.all([
      RentalOrder.find({
        status: { $in: ['active_rental'] },
        rentalEndDate: { $gte: todayStart, $lte: todayEnd },
      })
        .populate('user', 'name email phone')
        .select('rentalOrderId productTitle rentalEndDate status paymentStatus user quantity')
        .lean(),
      RentalOrder.find({
        status: { $in: ['active_rental', 'late_return'] },
        rentalEndDate: { $lt: todayStart },
      })
        .populate('user', 'name email phone')
        .select('rentalOrderId productTitle rentalEndDate status paymentStatus user quantity')
        .lean(),
      RentalOrder.find({
        status: { $in: ['active_rental'] },
        rentalEndDate: { $gt: todayEnd, $lte: threeDaysFromNow },
      })
        .populate('user', 'name email phone')
        .select('rentalOrderId productTitle rentalEndDate status paymentStatus user quantity')
        .lean(),
    ]);

    return { dueToday, overdue, upcoming };
  }

  /**
   * Record a manual payment (admin).
   */
  static async recordCodPayment(
    rentalId: string,
    amount: number,
    note: string,
    adminId: string,
    paymentMethod: string = 'cash',
  ) {
    const rental = await RentalOrder.findById(rentalId);
    if (!rental) throw new ApiError(404, 'Rental order not found');

    if (amount <= 0) {
      throw new ApiError(400, 'Payment amount must be greater than 0');
    }

    const effectiveAmountPaid = (rental.paymentHistory || []).reduce((sum, p) => sum + p.amount, 0);

    const currentPaid = rental.amountPaid ?? effectiveAmountPaid;
    const balanceDue = Math.max(0, rental.totalAmount - currentPaid);

    if (amount > balanceDue) {
      throw new ApiError(
        400,
        `Payment amount exceeds balance due of ₹${balanceDue.toLocaleString('en-IN')}`,
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!rental.paymentHistory) {
        rental.paymentHistory = [];
      }

      rental.paymentHistory.push({
        amount,
        method: paymentMethod || 'cash',
        note,
        recordedBy: adminId,
        date: new Date(),
      });

      rental.amountPaid = currentPaid + amount;

      if (rental.amountPaid >= rental.totalAmount) {
        rental.paymentStatus =
          rental.paymentMethod === 'Cash_on_Delivery' ? 'COD Collected' : 'paid';
      } else {
        rental.paymentStatus = 'partially_paid';
      }

      await rental.save({ session });

      const OutboxEvent = require('../models/OutboxEvent').default;
      await OutboxEvent.create(
        [
          {
            aggregateId: rental._id.toString(),
            aggregateType: 'RentalOrder',
            eventType: 'RentalPaymentReceived',
            payload: { orderId: rental._id.toString() },
          },
        ],
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      logger.info(
        `[RENTAL] Recorded COD payment of ₹${amount} for ${rental.rentalOrderId} by ${adminId}`,
      );
      return rental;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}

export default RentalService;
