import mongoose from 'mongoose';
import { IScanEvent } from '../types/scanEvent';
import Package from '../models/Package';
import { PickListService } from './PickListService';
import Order from '../../../models/Order';
import logger from '../../../config/logger';

export class ScanPipeline {
  /**
   * Routes a verified ScanEvent to the correct business logic handler
   */
  static async process(
    scanEvent: IScanEvent,
    session: mongoose.ClientSession,
  ): Promise<{ success: boolean; errorMessage?: string }> {
    try {
      switch (scanEvent.entityType) {
        case 'product':
          return await this.handleProductScan(scanEvent, session);
        case 'package':
          return await this.handlePackageScan(scanEvent, session);
        case 'operational':
          return await this.handleOperationalScan(scanEvent, session);
        case 'location':
          // Used for bin movements, cycle counts, etc.
          return { success: true };
        case 'transaction':
          return await this.handleTransactionScan(scanEvent, session);
        case 'rental':
        case 'event':
        case 'custom':
        case 'order':
          return await this.handleDomainScan(scanEvent, session);
        default:
          return { success: false, errorMessage: 'Unknown scan type' };
      }
    } catch (error: any) {
      logger.error('Pipeline process error:', error);
      return { success: false, errorMessage: error.message };
    }
  }

  private static async handleProductScan(scanEvent: IScanEvent, session: mongoose.ClientSession) {
    const PickList = require('../models/PickList').default;
    const activePickList = await PickList.findOne({
      assignedTo: scanEvent.scannedBy.userId,
      status: { $in: ['assigned', 'in_progress'] },
    }).session(session);

    if (activePickList) {
      let sku = scanEvent.rawValue;
      if (scanEvent.metadata?.decodedPayload?.sku) {
        sku = scanEvent.metadata.decodedPayload.sku;
      }

      await PickListService.updatePickedItem(
        activePickList.pickListId,
        sku,
        1,
        scanEvent.scannedBy.userId?.toString() || 'system',
      );

      // Analytics & Socket
      try {
        const { emitUserEvent } = require('../../../socket');
        emitUserEvent(`warehouse_room`, 'item_picked', {
          pickListId: activePickList.pickListId,
          sku,
        });
      } catch (e) {
        logger.warn('Socket emit failed', e);
      }

      return { success: true };
    }

    return { success: false, errorMessage: 'Worker has no active picklist for this product' };
  }

  private static async handlePackageScan(scanEvent: IScanEvent, session: mongoose.ClientSession) {
    const pkg = await Package.findOne({ packageId: scanEvent.entityId as string }).session(session);
    if (!pkg) return { success: false, errorMessage: 'Package not found' };

    const { OrderEventService } = require('../../orders/services/OrderEventService');

    if (pkg.status === 'ready_for_pickup') {
      pkg.status = 'shipped';
      await pkg.save({ session });

      const order = await Order.findByIdAndUpdate(
        pkg.orderId,
        { orderStatus: 'Shipped' },
        { session },
      );
      if (order) {
        // Create OrderEvent
        await OrderEventService.recordEvent(
          order._id,
          'purchase',
          'StatusUpdated:Shipped',
          {
            name: scanEvent.scannedBy.name || 'System',
            role: scanEvent.scannedBy.role || 'system',
          },
          'warehouse',
          { pkg: pkg.packageId },
          session,
        );

        // Notifications & Sockets
        try {
          const { emitUserEvent } = require('../../../socket');
          emitUserEvent(order.user.toString(), 'order_status_updated', {
            orderId: order._id,
            orderStatus: 'Shipped',
          });

          const { NotificationService } = require('../../../services/notificationService');
          await NotificationService.createNotification({
            userId: order.user,
            title: 'Order Shipped',
            message: `Your order has been shipped.`,
            type: 'order_update',
          });
        } catch (e) {
          logger.warn('Notification/Socket failed', e);
        }
      }
      return { success: true };
    } else if (
      pkg.status === 'created' ||
      pkg.status === 'items_verified' ||
      pkg.status === 'sealed' ||
      pkg.status === 'labeled'
    ) {
      pkg.status = 'ready_for_pickup';
      await pkg.save({ session });
      return { success: true };
    }

    return { success: false, errorMessage: `Invalid package state: ${pkg.status}` };
  }

  private static async handleTransactionScan(
    scanEvent: IScanEvent,
    session: mongoose.ClientSession,
  ) {
    if (!scanEvent.transactionId) {
      return { success: false, errorMessage: 'Transaction ID not found for this barcode' };
    }

    // Resolve Transaction
    const Transaction = require('../../../models/Transaction').Transaction;
    const txn = await Transaction.findById(scanEvent.transactionId).session(session);
    if (!txn) return { success: false, errorMessage: 'Transaction not found' };

    // Push tracking event
    const Fulfilment = require('../../../models/Fulfilment').default;
    const fulfilment = await Fulfilment.findOne({ transactionId: txn._id }).session(session);

    if (fulfilment) {
      scanEvent.action = 'verify';
      await (scanEvent as any).save({ session });

      await (fulfilment as any).addEvent(
        'PROCESSING',
        `Warehouse scan verified by ${scanEvent.scannedBy.name}`,
        scanEvent.location?.warehouseId || 'Main Warehouse',
        { scanId: scanEvent.scanId },
      );
      return { success: true };
    }

    return { success: false, errorMessage: 'Fulfilment record not found for transaction' };
  }

  private static async handleDomainScan(scanEvent: IScanEvent, session: mongoose.ClientSession) {
    // Determine the action (dispatch, receive) based on the current domain state, but for now we just verify it
    scanEvent.action = 'verify';
    await (scanEvent as any).save({ session });

    return { success: true };
  }

  private static async handleOperationalScan(
    scanEvent: IScanEvent,
    session: mongoose.ClientSession,
  ) {
    const payload = scanEvent.metadata?.decodedPayload;
    if (!payload) return { success: false, errorMessage: 'Invalid operational payload' };

    if (payload.action === 'start_picking') {
      const PickList = require('../models/PickList').default;
      const pickList = await PickList.findOne({ pickListId: payload.entityId }).session(session);
      if (!pickList) return { success: false, errorMessage: 'Picklist not found' };

      pickList.status = 'in_progress';
      pickList.startedAt = new Date();
      await pickList.save({ session });
      return { success: true };
    }

    return { success: false, errorMessage: `Unknown operational action: ${payload.action}` };
  }
}
