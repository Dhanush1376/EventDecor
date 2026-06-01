import mongoose from 'mongoose';
import Product from '../models/Product';
import RentalOrder from '../models/RentalOrder';
import RentalCalendar from '../models/RentalCalendar';
import RentalPolicy from '../models/RentalPolicy';
import RentalInspection from '../models/RentalInspection';
import ServiceArea from '../models/ServiceArea';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import getRazorpay from '../config/razorpay';
import { formatPaginationResponse } from '../utils/pagination';
import User from '../models/User';
import { createAdminNotification, sendDirectEmail } from './notificationService';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { getAdminEmails } from '../config/adminConfig';
import { compileTemplate } from '../utils/templateEngine';

class RentalService {
  /**
   * Calculate the rental cost server-side — NEVER trust frontend calculations.
   */
  static async calculateRentalCost(productId: string, startDate: Date, endDate: Date) {
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

    // Determine best rate for customer
    const pricing = product.rentalPricing;
    let rentalCharge = 0;
    let rateType: 'daily' | 'weekly' | 'monthly' | 'custom' = 'daily';
    let rateUsed = 0;

    if (durationDays >= 30 && pricing.monthly > 0) {
      const months = Math.floor(durationDays / 30);
      const remainingDays = durationDays % 30;
      rentalCharge =
        months * pricing.monthly + remainingDays * (pricing.daily || pricing.monthly / 30);
      rateType = 'monthly';
      rateUsed = pricing.monthly;
    } else if (durationDays >= 7 && pricing.weekly > 0) {
      const weeks = Math.floor(durationDays / 7);
      const remainingDays = durationDays % 7;
      rentalCharge = weeks * pricing.weekly + remainingDays * (pricing.daily || pricing.weekly / 7);
      rateType = 'weekly';
      rateUsed = pricing.weekly;
    } else if (pricing.daily > 0) {
      rentalCharge = durationDays * pricing.daily;
      rateType = 'daily';
      rateUsed = pricing.daily;
    } else if (pricing.customDurationEnabled && pricing.customPricePerDay > 0) {
      rentalCharge = durationDays * pricing.customPricePerDay;
      rateType = 'custom';
      rateUsed = pricing.customPricePerDay;
    } else {
      throw new ApiError(400, 'No rental pricing configured for this product');
    }

    rentalCharge = Math.round(rentalCharge * 100) / 100;

    const securityDeposit = product.securityDeposit || 0;
    const deliveryCharge = 0; // Future: calculate based on distance
    const taxRate = 0.18; // 18% GST
    const tax = Math.round(rentalCharge * taxRate * 100) / 100;
    const totalAmount =
      Math.round((rentalCharge + securityDeposit + deliveryCharge + tax) * 100) / 100;

    return {
      productId: product._id,
      productTitle: product.title,
      durationDays,
      rentalRate: { type: rateType, rate: rateUsed },
      rentalCharge,
      securityDeposit,
      isDepositRefundable: product.isDepositRefundable,
      deliveryCharge,
      tax,
      totalAmount,
      startDate: start,
      endDate: end,
    };
  }

  /**
   * Check if a product is available for the requested date range.
   */
  static async checkAvailability(productId: string, startDate: Date, endDate: Date) {
    const product = await Product.findById(productId).lean();
    if (!product) throw new ApiError(404, 'Product not found');
    if (!product.rentalEnabled) throw new ApiError(400, 'This product is not available for rent');

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check rental stock
    if (product.rentalStock <= 0) {
      return { available: false, reason: 'No rental stock available' };
    }

    // Check for overlapping bookings
    const overlappingCount = await RentalCalendar.countDocuments({
      product: productId,
      status: 'booked',
      $or: [{ startDate: { $lt: end }, endDate: { $gt: start } }],
    });

    if (overlappingCount >= product.rentalStock) {
      return {
        available: false,
        reason: 'Product is fully booked for the selected dates',
        nextAvailable: await this.getNextAvailableDate(productId, start),
      };
    }

    return { available: true };
  }

  /**
   * Find the next available date for a product.
   */
  static async getNextAvailableDate(productId: string, fromDate: Date): Promise<Date | null> {
    const bookings = await RentalCalendar.find({
      product: productId,
      status: 'booked',
      endDate: { $gte: fromDate },
    })
      .sort({ endDate: 1 })
      .limit(5)
      .lean();

    if (bookings.length === 0) return fromDate;

    // Return the earliest endDate
    return bookings[0].endDate;
  }

  /**
   * Check if coordinates fall within any active service area.
   * Uses the Haversine formula for distance calculation.
   */
  static async checkServiceArea(lat: number, lng: number) {
    const serviceAreas = await ServiceArea.find({ isActive: true }).lean();

    if (serviceAreas.length === 0) {
      // No service areas configured = allow all
      return { eligible: true, message: 'Delivery available' };
    }

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

    return {
      eligible: false,
      message: 'Sorry, rental delivery is not available in your area',
    };
  }

  /**
   * Haversine formula to calculate distance between two lat/lng points in km.
   */
  static haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Create a rental order with full transactional safety.
   */
  static async createRentalOrder(data: any, userId: string) {
    const {
      productId,
      rentalStartDate,
      rentalEndDate,
      shippingAddress,
      identityDocuments,
      agreementAccepted,
      paymentMethod,
      aadhaarNumber,
    } = data;

    // Server-side recalculate — NEVER trust frontend pricing
    const costBreakdown = await this.calculateRentalCost(productId, rentalStartDate, rentalEndDate);

    // Check availability
    const availability = await this.checkAvailability(productId, rentalStartDate, rentalEndDate);
    if (!availability.available) {
      throw new ApiError(400, availability.reason || 'Product not available for selected dates');
    }

    // Check service area
    const activeServiceAreas = await ServiceArea.countDocuments({ isActive: true });
    if (activeServiceAreas > 0) {
      if (!shippingAddress.latitude || !shippingAddress.longitude) {
        throw new ApiError(
          400,
          'Delivery coordinates are required to verify service area eligibility',
        );
      }
      const serviceCheck = await this.checkServiceArea(
        shippingAddress.latitude,
        shippingAddress.longitude,
      );
      if (!serviceCheck.eligible) {
        throw new ApiError(400, serviceCheck.message);
      }
    }

    // Check rental policy for identity verification
    const policy = await RentalPolicy.findOne({ isActive: true }).lean();
    if (policy?.identityVerificationRequired) {
      if (!identityDocuments || identityDocuments.length === 0) {
        throw new ApiError(400, 'Identity verification documents are required');
      }
      if (policy.requiredDocuments.length > 0) {
        const providedTypes = identityDocuments.map((d: any) => d.type);
        const missingDocs = policy.requiredDocuments.filter(
          (req: string) => !providedTypes.includes(req),
        );
        if (missingDocs.length > 0) {
          throw new ApiError(400, `Missing required documents: ${missingDocs.join(', ')}`);
        }
      }
    }

    if (!agreementAccepted) {
      throw new ApiError(400, 'Rental agreement must be accepted');
    }

    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

    // Create Razorpay order if not COD
    const isCod = paymentMethod === 'cod';
    let razorpayOrder = null;

    if (!isCod) {
      const razorpay = getRazorpay();
      if (!razorpay) {
        throw new ApiError(500, 'Payment gateway is not configured');
      }

      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(costBreakdown.totalAmount * 100),
        currency: 'INR',
        receipt: `rental_${Date.now()}`,
        notes: {
          type: 'rental',
          productId: productId,
          userId: userId,
        },
      });
    }

    // Transactional order creation
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Acquire a write lock on the product to serialize calendar overlap checks and prevent double bookings
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId },
        { $set: { updatedAt: new Date() } },
        { new: true, session },
      );

      if (!updatedProduct) {
        throw new ApiError(400, 'Product not found during reservation');
      }

      // Re-verify calendar overlaps inside the transaction
      const overlappingCount = await RentalCalendar.countDocuments({
        product: productId,
        status: 'booked',
        $or: [
          { startDate: { $lt: costBreakdown.endDate }, endDate: { $gt: costBreakdown.startDate } },
        ],
      }).session(session);

      if (overlappingCount >= updatedProduct.rentalStock) {
        throw new ApiError(400, 'Product is fully booked for the selected dates');
      }

      // Create rental order
      const [rentalOrder] = await RentalOrder.create(
        [
          {
            user: userId,
            product: productId,
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
            totalAmount: costBreakdown.totalAmount,
            status: isCod ? 'confirmed' : 'pending',
            paymentMethod: isCod ? 'cod' : 'razorpay',
            paymentStatus: isCod ? 'Pending COD' : 'pending',
            shippingAddress,
            identityDocuments: identityDocuments || [],
            agreementAcceptedAt: new Date(),
            razorpayOrderId: razorpayOrder?.id,
            statusHistory: [
              {
                status: isCod ? 'confirmed' : 'pending',
                note: isCod ? 'Rental COD order placed' : 'Rental order created, awaiting payment',
              },
            ],
          },
        ],
        { session },
      );

      // Block calendar dates
      await RentalCalendar.create(
        [
          {
            product: productId,
            rentalOrder: rentalOrder._id,
            startDate: costBreakdown.startDate,
            endDate: costBreakdown.endDate,
            status: 'booked',
          },
        ],
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      if (isCod) {
        return { rentalOrder };
      }

      return {
        rentalOrder,
        razorpayOrderId: razorpayOrder?.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amount: Math.round(costBreakdown.totalAmount * 100),
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Verify rental payment — mirrors the existing PaymentService pattern.
   */
  static async verifyRentalPayment(paymentData: any, userId: string) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;
    const crypto = require('crypto');

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) throw new ApiError(500, 'Payment verification not configured');

    // Verify signature
    const shasum = crypto.createHmac('sha256', razorpayKeySecret);
    shasum.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const digest = shasum.digest('hex');
    const expected = Buffer.from(digest, 'utf8');
    const received = Buffer.from(razorpaySignature || '', 'utf8');
    const isValid =
      expected.length === received.length && crypto.timingSafeEqual(expected, received);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await RentalOrder.findOne({
        razorpayOrderId,
        paymentStatus: { $in: ['pending', 'failed'] },
      }).session(session);

      if (!order) {
        const existing = await RentalOrder.findOne({ razorpayOrderId }).lean();
        if (existing?.paymentStatus === 'paid') {
          await session.abortTransaction();
          session.endSession();
          return existing;
        }
        throw new ApiError(404, 'Rental order not found');
      }

      if (order.user.toString() !== userId) {
        throw new ApiError(403, 'Not authorized to verify this payment');
      }

      if (!isValid) {
        // Release calendar block
        await RentalCalendar.deleteOne({ rentalOrder: order._id }, { session });
        order.paymentStatus = 'failed';
        order.statusHistory.push({ status: 'pending', note: 'Payment verification failed' } as any);
        await order.save({ session });
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

      await session.commitTransaction();
      session.endSession();

      logger.info(`[RENTAL] Payment verified for rental order: ${order.rentalOrderId}`);

      try {
        const user = await User.findById(userId);
        const adminEmails = getAdminEmails();

        // 1. Admin Real-time Notification
        await createAdminNotification({
          title: 'New Rental Order',
          message: `${user?.name || 'A customer'} placed a new rental order (₹${order.totalAmount}) via Razorpay.`,
          type: 'order',
          actionLink: `/admin/rental-orders/${order._id}`,
        });

        // 2. PDF Invoice
        const pdfBuffer = await generateInvoicePDF({
          orderId: order.rentalOrderId,
          date: order.createdAt || new Date(),
          customerName: user?.name || 'Customer',
          shippingAddress:
            typeof order.shippingAddress === 'string'
              ? order.shippingAddress
              : order.shippingAddress?.address || '',
          items: [
            {
              name: order.productTitle,
              quantity: 1,
              price: order.rentalCharge,
            },
          ],
          subtotal: order.rentalCharge + order.securityDeposit,
          shipping: order.deliveryCharge,
          total: order.totalAmount,
        });

        if (user) {
          const frontendUrl = process.env.FRONTEND_URLS?.split(',')[0] || 'http://localhost:5173';

          // 3. Compile HTML Template
          const htmlContent = compileTemplate('order-confirmation', {
            customerName: user.name,
            orderId: order.rentalOrderId,
            orderDate: new Date().toISOString(),
            paymentMethod: 'Online Payment (Razorpay)',
            items: [
              {
                name: order.productTitle,
                quantity: 1,
                price: order.rentalCharge,
                image: order.productImage,
              },
            ],
            subtotal: order.rentalCharge + order.securityDeposit,
            shipping: order.deliveryCharge,
            total: order.totalAmount,
            shippingAddress:
              typeof order.shippingAddress === 'string'
                ? order.shippingAddress
                : order.shippingAddress?.address || '',
            dashboardUrl: `${frontendUrl}/dashboard?tab=orders`,
            currentYear: new Date().getFullYear(),
          });

          // 4. Send Customer Email
          await sendDirectEmail({
            email: user.email,
            subject: `Rental Order Confirmed! ✦ Siri Arts & Crafts [${order.rentalOrderId}]`,
            customHtml: htmlContent,
            type: 'order',
            action: 'order_placed',
            userId: user._id.toString(),
            attachments: [
              {
                filename: `Invoice_${order.rentalOrderId}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ],
          });

          // 5. Send Admin Alert Email
          if (adminEmails.length > 0) {
            await sendDirectEmail({
              email: adminEmails[0],
              subject: `New Rental Received - ₹${order.totalAmount} [${order.rentalOrderId}]`,
              customHtml: htmlContent,
              type: 'system',
              action: 'admin_order_alert',
              attachments: [
                {
                  filename: `Invoice_${order.rentalOrderId}.pdf`,
                  content: pdfBuffer,
                  contentType: 'application/pdf',
                },
              ],
            });
          }
        }
      } catch (emailErr) {
        logger.error('Failed to dispatch rental confirmation email/PDF:', emailErr);
      }

      return order;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
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

    rental.status = status as any;
    rental.statusHistory.push({ status, note, performedBy: adminId } as any);

    // Auto-set active_rental when delivered
    if (status === 'delivered') {
      rental.status = 'active_rental';
      rental.statusHistory.push({
        status: 'active_rental',
        note: 'Rental period started',
        performedBy: 'system',
      } as any);
    }

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

    rental.status = 'return_requested';
    rental.returnRequestedAt = new Date();
    rental.statusHistory.push({
      status: 'return_requested',
      note: 'Customer requested product return',
    } as any);

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
      rental.status = 'returned';
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
      rental.statusHistory.push({
        status: 'returned',
        note: `Item returned and inspected. Condition: ${condition}`,
        performedBy: adminId,
      } as any);
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
    rental.status = 'completed';
    rental.statusHistory.push({
      status: 'completed',
      note: `Deposit of ₹${amount} released. Reason: ${reason}`,
      performedBy: adminId,
    } as any);

    await rental.save();
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

      rental.status = 'cancelled';
      rental.statusHistory.push({
        status: 'cancelled',
        note: `Order cancelled. Refund: ${refundPercent}%`,
        performedBy: isAdmin ? 'admin' : userId,
      } as any);
      await rental.save({ session });

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
