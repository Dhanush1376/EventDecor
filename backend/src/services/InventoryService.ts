import mongoose from 'mongoose';
import Product from '../models/Product';
import InventoryReservation from '../models/InventoryReservation';
import InventoryEvent from '../domains/inventory/models/InventoryEvent';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import * as Sentry from '@sentry/node';

export class InventoryService {
  private static async createInventoryEvent(
    productId: string,
    quantity: number,
    eventType: string,
    source: 'scan' | 'api' | 'system' | 'manual_override',
    performedByStr: string,
    notes: string,
    orderId?: string,
    session?: mongoose.ClientSession,
  ) {
    const eventId = `INV-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;

    let performedBy: any = { name: 'System', role: 'system' };
    if (mongoose.Types.ObjectId.isValid(performedByStr)) {
      performedBy = {
        userId: new mongoose.Types.ObjectId(performedByStr),
        name: 'User',
        role: 'user',
      };
    } else if (performedByStr && performedByStr !== 'system') {
      performedBy = { name: performedByStr, role: 'admin' };
    }

    const event = new InventoryEvent({
      eventId,
      productId,
      eventType,
      toState: 'updated',
      quantity,
      performedBy,
      source,
      notes,
      orderId,
    });

    if (session) await event.save({ session });
    else await event.save();
  }

  /**
   * Soft-allocates inventory (creates a TTL reservation).
   * Uses ATOMIC $inc to prevent race conditions under concurrent checkout.
   */
  static async reserveInventory(
    productId: string,
    quantity: number,
    userId: string,
    ttlMinutes: number = 15,
    session?: mongoose.ClientSession,
  ) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // ATOMIC: Reserve stock using $inc with $expr pre-condition
    // This prevents concurrent checkouts from overselling
    const product = await Product.findOneAndUpdate(
      {
        _id: productId,
        isActive: true,
        $expr: { $gte: [{ $subtract: ['$stock', '$reservedStock'] }, quantity] },
      },
      { $inc: { reservedStock: quantity } },
      { session: session || null, returnDocument: 'after' },
    );

    if (!product) {
      // Determine whether product doesn't exist or stock is insufficient
      const existingProduct = await Product.findById(productId)
        .select('stock reservedStock isActive')
        .session(session || null)
        .lean();
      if (!existingProduct) throw new ApiError(404, 'Product not found');
      if (!existingProduct.isActive) throw new ApiError(400, 'Product is no longer active');
      const available = existingProduct.stock - existingProduct.reservedStock;
      throw new ApiError(400, `Insufficient stock. Only ${Math.max(0, available)} available.`);
    }

    const previousReservedStock = product.reservedStock - quantity; // Compute pre-update value

    const reservation = await InventoryReservation.create(
      [
        {
          product: productId,
          user: userId,
          quantity,
          status: 'reserved',
          expiresAt,
        },
      ],
      { session },
    );

    // Audit trail
    await InventoryService.createInventoryEvent(
      productId,
      0, // reservation doesn't change actual stock yet
      'reserved',
      'api',
      userId,
      `Reserved ${quantity} units (reservedStock: ${previousReservedStock} → ${product.reservedStock}). ReservationId: ${reservation[0]._id}. TTL: ${ttlMinutes}min`,
      undefined,
      session,
    );

    return reservation[0];
  }

  /**
   * Confirms a reservation and permanently deducts stock.
   * Uses ATOMIC $inc to prevent race conditions.
   */
  static async confirmReservation(reservationId: string, session?: mongoose.ClientSession) {
    const reservation = await InventoryReservation.findById(reservationId).session(session || null);
    if (!reservation) throw new ApiError(404, 'Reservation not found');
    if (reservation.status !== 'reserved') return reservation;

    // ATOMIC: Deduct stock and release reservedStock in a single operation
    const product = await Product.findOneAndUpdate(
      { _id: reservation.product },
      { $inc: { stock: -reservation.quantity, reservedStock: -reservation.quantity } },
      { session: session || null, returnDocument: 'after' },
    );

    if (!product) throw new ApiError(404, 'Product not found');

    const previousStock = product.stock + reservation.quantity;
    const previousReservedStock = product.reservedStock + reservation.quantity;

    // Negative stock detection
    if (product.stock < 0) {
      Sentry.captureMessage('CRITICAL: Negative stock detected during reservation confirmation', {
        level: 'error',
        tags: { critical: 'inventory_integrity' },
        extra: {
          productId: product._id,
          previousStock,
          quantity: reservation.quantity,
          reservationId,
          currentStock: product.stock,
        },
      });
      logger.error(
        `[INVENTORY CRITICAL] Negative stock for product ${product._id}: ${previousStock} - ${reservation.quantity} = ${product.stock}`,
      );

      // Self-heal: clamp to zero
      await Product.findByIdAndUpdate(
        product._id,
        { $max: { stock: 0, reservedStock: 0 } },
        { session: session || null },
      );
    }

    // Low stock alert
    const threshold = product.lowStockThreshold || 5;
    if (previousStock >= threshold && product.stock < threshold) {
      const { createAdminNotification } = require('./notificationService');
      await createAdminNotification({
        title: 'Low Stock Alert',
        message: `Product ${product.title || product._id} has dropped below the low stock threshold (${product.stock} left).`,
        type: 'system',
        actionLink: `/admin/products/${product._id}/edit`,
      }).catch((e: any) => logger.error('Failed to create low stock alert', e));
    }

    reservation.status = 'confirmed';
    await reservation.save({ session });

    // Audit trail
    await InventoryService.createInventoryEvent(
      reservation.product.toString(),
      -reservation.quantity,
      'confirmed',
      'api',
      'system',
      `Reservation confirmed. Stock: ${previousStock} → ${product.stock}. ReservedStock: ${previousReservedStock} → ${product.reservedStock}. ReservationId: ${reservationId}`,
      undefined,
      session,
    );

    return reservation;
  }

  /**
   * Freezes a reservation (extends TTL significantly) when an order requires manual admin approval.
   */
  static async freezeReservation(
    reservationId: string,
    daysToExtend: number = 7,
    session?: mongoose.ClientSession,
  ) {
    const reservation = await InventoryReservation.findById(reservationId).session(session || null);
    if (!reservation) return null;

    // Extend expiry by daysToExtend
    reservation.expiresAt = new Date(Date.now() + daysToExtend * 24 * 60 * 60 * 1000);
    await reservation.save({ session });

    await InventoryService.createInventoryEvent(
      reservation.product.toString(),
      0,
      'frozen',
      'system',
      'system',
      `Reservation frozen for admin review. Expiry extended by ${daysToExtend} days. ReservationId: ${reservationId}`,
      undefined,
      session,
    );

    return reservation;
  }

  /**
   * Cancels a reservation explicitly and frees up reserved stock.
   * Uses ATOMIC $inc to prevent race conditions.
   */
  static async cancelReservation(reservationId: string, session?: mongoose.ClientSession) {
    const reservation = await InventoryReservation.findById(reservationId).session(session || null);
    if (!reservation) throw new ApiError(404, 'Reservation not found');
    if (reservation.status !== 'reserved') return reservation;

    // ATOMIC: Release reserved stock
    const product = await Product.findOneAndUpdate(
      { _id: reservation.product, reservedStock: { $gte: reservation.quantity } },
      { $inc: { reservedStock: -reservation.quantity } },
      { session: session || null, returnDocument: 'after' },
    );

    if (!product) {
      // Fallback: clamp reservedStock to 0 if it would go negative
      await Product.findOneAndUpdate(
        { _id: reservation.product },
        { $set: { reservedStock: 0 } },
        { session: session || null },
      );
      logger.warn(
        `[INVENTORY] ReservedStock underflow detected during cancel for product ${reservation.product}. Clamped to 0.`,
      );
    }

    const previousReservedStock = product ? product.reservedStock + reservation.quantity : 0;

    reservation.status = 'expired';
    await reservation.save({ session });

    // Audit trail
    await InventoryService.createInventoryEvent(
      reservation.product.toString(),
      0,
      'cancelled',
      'system',
      'system',
      `Reservation cancelled. ReservedStock: ${previousReservedStock} → ${product?.reservedStock ?? 0}. ReservationId: ${reservationId}`,
      undefined,
      session,
    );

    return reservation;
  }

  /**
   * Restores stock when an order is cancelled or returned after payment was confirmed.
   * Uses ATOMIC $inc to prevent race conditions.
   */
  static async restoreStock(
    productId: string,
    quantity: number,
    reason: 'order_cancelled' | 'return' | 'stale_release',
    orderId?: string,
    referenceType?: 'Order' | 'RentalOrder' | 'EventJob',
    performedBy?: string,
    session?: mongoose.ClientSession,
  ) {
    // ATOMIC: Restore stock
    const product = await Product.findOneAndUpdate(
      { _id: productId },
      { $inc: { stock: quantity } },
      { session: session || null, returnDocument: 'after' },
    );

    if (!product) {
      logger.error(`[INVENTORY] Cannot restore stock for missing product ${productId}`);
      return;
    }

    const previousStock = product.stock - quantity;

    // Audit trail
    await InventoryService.createInventoryEvent(
      productId,
      quantity,
      'restored',
      'system',
      performedBy || 'system',
      `Stock restored: ${previousStock} → ${product.stock} (+${quantity})`,
      orderId,
      session,
    );
  }

  /**
   * Releases reserved stock without confirming (for pending orders being cancelled).
   * Uses ATOMIC $inc to prevent race conditions.
   */
  static async releaseReservedStock(
    productId: string,
    quantity: number,
    reason: 'order_cancelled' | 'stale_release',
    orderId?: string,
    referenceType?: 'Order' | 'RentalOrder' | 'EventJob',
    performedBy?: string,
    session?: mongoose.ClientSession,
  ) {
    // ATOMIC: Release reserved stock with floor protection
    const product = await Product.findOneAndUpdate(
      { _id: productId, reservedStock: { $gte: quantity } },
      { $inc: { reservedStock: -quantity } },
      { session: session || null, returnDocument: 'after' },
    );

    if (!product) {
      // Fallback: clamp to 0 if underflow
      const fallbackProduct = await Product.findOneAndUpdate(
        { _id: productId },
        { $set: { reservedStock: 0 } },
        { session: session || null, returnDocument: 'after' },
      );
      if (!fallbackProduct) {
        logger.error(`[INVENTORY] Cannot release reserved stock for missing product ${productId}`);
        return;
      }
      logger.warn(
        `[INVENTORY] ReservedStock underflow during release for product ${productId}. Clamped to 0.`,
      );

      await InventoryService.createInventoryEvent(
        productId,
        0,
        'released_underflow',
        'system',
        performedBy || 'system',
        `ReservedStock released with underflow clamp. ReservedStock → 0 (requested -${quantity})`,
        orderId,
        session,
      );
      return;
    }

    const previousReservedStock = product.reservedStock + quantity;

    // Audit trail
    await InventoryService.createInventoryEvent(
      productId,
      0,
      'released',
      'system',
      performedBy || 'system',
      `ReservedStock released: ${previousReservedStock} → ${product.reservedStock} (-${quantity})`,
      orderId,
      session,
    );
  }

  /**
   * Admin manual inventory adjustment with full audit trail.
   */
  static async adjustInventory(
    productId: string,
    adjustment: number,
    reason: string,
    performedBy: string,
    session?: mongoose.ClientSession,
  ) {
    const product = await Product.findOneAndUpdate(
      { _id: productId },
      { $inc: { stock: adjustment } },
      { session: session || null, returnDocument: 'after' },
    );

    if (!product) throw new ApiError(404, 'Product not found');

    const previousStock = product.stock - adjustment;

    // Clamp negative stock
    if (product.stock < 0) {
      await Product.findByIdAndUpdate(
        productId,
        { $set: { stock: 0 } },
        { session: session || null },
      );
      logger.warn(`[INVENTORY] Negative stock after adjustment for ${productId}. Clamped to 0.`);
    }

    await InventoryService.createInventoryEvent(
      productId,
      adjustment,
      'adjusted',
      'manual_override',
      performedBy,
      `Manual inventory adjustment by ${performedBy}: ${previousStock} → ${product.stock} (${adjustment >= 0 ? '+' : ''}${adjustment}). Reason: ${reason}`,
      undefined,
      session,
    );

    return { previousStock, newStock: Math.max(0, product.stock), adjustment };
  }

  /**
   * Records damaged inventory and permanently removes it from stock.
   */
  static async damageReport(
    productId: string,
    quantity: number,
    notes: string,
    performedBy: string,
    session?: mongoose.ClientSession,
  ) {
    if (quantity <= 0) throw new ApiError(400, 'Damage quantity must be positive');

    // ATOMIC: Deduct damaged stock
    const product = await Product.findOneAndUpdate(
      { _id: productId },
      { $inc: { stock: -quantity } },
      { session: session || null, returnDocument: 'after' },
    );

    if (!product) throw new ApiError(404, 'Product not found');

    const previousStock = product.stock + quantity;

    // Clamp negative stock
    if (product.stock < 0) {
      await Product.findByIdAndUpdate(
        productId,
        { $set: { stock: 0 } },
        { session: session || null },
      );
      logger.warn(`[INVENTORY] Negative stock after damage report for ${productId}. Clamped to 0.`);
    }

    // Audit trail
    await InventoryService.createInventoryEvent(
      productId,
      -quantity,
      'damaged',
      'manual_override',
      performedBy,
      `Damage reported: -${quantity} units. Notes: ${notes}`,
      undefined,
      session,
    );

    return { previousStock, newStock: Math.max(0, product.stock), damaged: quantity };
  }

  static async sweepExpiredReservations() {
    const now = new Date();
    // Find reservations that passed their TTL but are still 'reserved'
    const expiredReservations = await InventoryReservation.find({
      status: 'reserved',
      expiresAt: { $lt: now },
    }).limit(50); // Batch process up to 50

    if (expiredReservations.length === 0) return 0;

    let sweptCount = 0;

    for (const res of expiredReservations) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // ATOMIC: Release reserved stock
        const product = await Product.findOneAndUpdate(
          { _id: res.product, reservedStock: { $gte: res.quantity } },
          { $inc: { reservedStock: -res.quantity } },
          { session, returnDocument: 'after' },
        );

        if (!product) {
          // Fallback clamp
          await Product.findOneAndUpdate(
            { _id: res.product },
            { $set: { reservedStock: 0 } },
            { session },
          );
        }

        const previousReservedStock = product ? product.reservedStock + res.quantity : 0;

        // Audit trail
        await InventoryService.createInventoryEvent(
          res.product.toString(),
          0,
          'swept',
          'system',
          'system',
          `Expired reservation swept. ReservedStock: ${previousReservedStock} → ${product?.reservedStock ?? 0}. ReservationId: ${res._id}`,
          undefined,
          session,
        );

        res.status = 'expired';
        await res.save({ session });

        await session.commitTransaction();
        sweptCount++;
      } catch (err: any) {
        await session.abortTransaction();
        logger.error(
          `[InventoryService] Failed to sweep expired reservation ${res._id}: ${err.message}`,
        );
      } finally {
        session.endSession();
      }
    }

    if (sweptCount > 20) {
      Sentry.captureMessage(`High volume of expired reservations swept (${sweptCount})`, {
        level: 'warning',
        tags: { critical: 'inventory_leakage' },
      });
      logger.warn(`[InventoryService] High volume of expired reservations swept: ${sweptCount}`);
    }

    return sweptCount;
  }
}
