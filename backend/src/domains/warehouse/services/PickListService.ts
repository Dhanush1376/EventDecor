import mongoose from 'mongoose';
import PickList from '../models/PickList';
import Order from '../../../models/Order';
import Product from '../../../models/Product';
import { QRCodeService } from '../../../shared/services/barcode/QRCodeService';

export class PickListService {
  /**
   * Generates a picklist for a specific order and assigns it to a worker.
   */
  static async generateForOrder(
    orderId: string,
    workerId: string,
    session?: mongoose.ClientSession,
  ) {
    const order = await Order.findById(orderId).session(session || null);
    if (!order) throw new Error('Order not found');

    const items = await Promise.all(
      order.items.map(async (item: any) => {
        const product = await Product.findById(item.productId).session(session || null);

        // Resolve the real bin location from the product's warehouse mapping.
        // Products that have not been slotted yet report an empty location so
        // the picker knows to look it up rather than being sent to a fake bin.
        const primaryLocation = product?.warehouseLocations?.[0];
        const location = primaryLocation
          ? {
              zone: primaryLocation.zoneId || '',
              aisle: primaryLocation.aisleId || '',
              shelf: primaryLocation.shelfId || '',
              bin: primaryLocation.binId || '',
            }
          : { zone: '', aisle: '', shelf: '', bin: '' };

        return {
          productId: item.productId,
          sku: product?.sku || `SKU-${item.productId}`,
          quantity: item.quantity,
          pickedQuantity: 0,
          location,
          orderId: order._id,
          status: 'pending',
        };
      }),
    );

    const pickList = new PickList({
      pickListId: `PL-${Date.now().toString().slice(-6)}`,
      assignedTo: new mongoose.Types.ObjectId(workerId),
      items,
      status: 'assigned',
    });

    if (session) {
      await pickList.save({ session });
    } else {
      await pickList.save();
    }

    return pickList;
  }

  /**
   * Generates a printable operational QR code for a worker to scan and open the picklist
   */
  static generatePickListQrCode(pickListId: string): string {
    return QRCodeService.generateOperationalQrPayload('start_picking', pickListId, '12h');
  }

  /**
   * Updates an item's picked quantity in the picklist
   */
  static async updatePickedItem(
    pickListId: string,
    sku: string,
    quantity: number,
    workerId: string,
  ) {
    const pickList = await PickList.findOne({ pickListId, assignedTo: workerId });
    if (!pickList) throw new Error('Picklist not found or unauthorized');

    if (pickList.status === 'assigned') {
      pickList.status = 'in_progress';
      pickList.startedAt = new Date();
    }

    const item = pickList.items.find((i: any) => i.sku === sku);
    if (!item) throw new Error('SKU not found in picklist');

    item.pickedQuantity += quantity;
    if (item.pickedQuantity >= item.quantity) {
      item.status = 'picked';
      item.pickedQuantity = item.quantity; // Cap at required
    } else {
      item.status = 'partial';
    }

    // Check if all items are picked
    const allPicked = pickList.items.every((i: any) => i.status === 'picked');
    if (allPicked) {
      pickList.status = 'completed';
      pickList.completedAt = new Date();
    }

    await pickList.save();
    return pickList;
  }
}
