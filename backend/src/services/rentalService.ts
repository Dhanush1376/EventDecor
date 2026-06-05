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

class RentalService {
  static async checkAvailability(productId: string, startDate: Date, endDate: Date) {
    return await RentalAvailabilityService.checkAvailability(productId, startDate, endDate);
  }

  static async calculateRentalCost(productId: string, startDate: Date, endDate: Date) {
    return await RentalCheckoutService.calculateRentalCost(productId, startDate, endDate);
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
    const filter: any = { user: userId };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [rentals, total] = await Promise.all([
      RentalOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      RentalOrder.countDocuments(filter),
    ]);

    return formatPaginationResponse(rentals, total, Number(page), Number(limit));
  }

  /**
   * Get single rental order detail.
   */
  static async getRentalDetail(rentalId: string, userId?: string) {
    const filter: any = { _id: rentalId };
    if (userId) filter.user = userId; // Non-admin users can only see their own

    const rental = await RentalOrder.findOne(filter)
      .populate('product', 'title imageSrc images price rentalPricing rentalEnabled')
      .lean();

    if (!rental) throw new ApiError(404, 'Rental order not found');
    return rental;
  }

  /**
   * Get all rental orders (admin).
   */
  static async getAllRentals(queryParams: any) {
    const { status, search, page = 1, limit = 20 } = queryParams;
    const filter: any = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { rentalOrderId: new RegExp(search, 'i') },
        { productTitle: new RegExp(search, 'i') },
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

    RentalStateMachine.transition(rental, status as any, note, adminId);
    await rental.save();
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
  static async releaseDeposit(rentalId: string, amount: number, reason: string, adminId: string) {
    const rental = await RentalOrder.findById(rentalId);
    if (!rental) throw new ApiError(404, 'Rental order not found');

    if (rental.depositRefund) {
      throw new ApiError(400, 'Deposit has already been refunded for this order');
    }

    if (amount > rental.securityDeposit) {
      throw new ApiError(400, 'Refund amount cannot exceed the security deposit');
    }

    rental.depositRefund = {
      amount,
      date: new Date(),
      reason,
      processedBy: adminId,
    };

    RentalStateMachine.transition(
      rental,
      'completed',
      `Deposit of ₹${amount} released. Reason: ${reason}`,
      adminId,
    );

    await rental.save();

    // Initiate actual Razorpay refund for the deposit amount
    if (amount > 0 && rental.razorpayPaymentId) {
      try {
        await PaymentRefundService.initiateAsyncRefund({
          amount,
          currency: 'INR',
          originalTransactionId: rental.razorpayPaymentId,
          entityType: 'Rental',
          entityId: rental._id,
        });
        logger.info(
          `[RENTAL] Razorpay deposit refund of ₹${amount} initiated for ${rental.rentalOrderId}`,
        );
      } catch (refundErr: any) {
        logger.error(
          `[CRITICAL] Failed to enqueue Razorpay deposit refund for rental ${rental._id}:`,
          refundErr,
        );
      }
    }

    logger.info(`[RENTAL] Deposit ₹${amount} released for ${rental.rentalOrderId} by ${adminId}`);
    return rental;
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

    const bookings = await RentalCalendar.find({
      product: productId,
      status: 'booked',
      $or: [{ startDate: { $lte: endOfMonth }, endDate: { $gte: startOfMonth } }],
    })
      .populate('rentalOrder', 'rentalOrderId user productTitle status durationDays')
      .sort({ startDate: 1 })
      .lean();

    const product = await Product.findById(productId)
      .select('title rentalStock rentalEnabled')
      .lean();

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
}

export default RentalService;
