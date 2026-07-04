import mongoose from 'mongoose';
import Package from '../models/Package';
import { PackagingCalculator } from './PackagingCalculator';

export class PackageService {
  /**
   * Auto-generates packages for an order based on optimal packaging rules
   */
  static async autoPackOrder(orderId: string, session?: mongoose.ClientSession) {
    const proposal = await PackagingCalculator.calculateForOrder(orderId);
    const createdPackages = [];

    for (const pkg of proposal.packages) {
      const packageId = `PKG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;

      const newPackage = new Package({
        packageId,
        orderId: new mongoose.Types.ObjectId(orderId),
        items: pkg.items.map((i) => ({
          productId: new mongoose.Types.ObjectId(i.productId),
          sku: i.sku,
          quantity: i.quantity,
          packedQuantity: 0, // Waiting for physical scan
        })),
        dimensions: { length: 0, width: 0, height: 0 }, // Would be set based on pkg.size
        weight: pkg.weight,
        sizeCategory: pkg.size,
        status: 'created',
      });

      if (session) {
        await newPackage.save({ session });
      } else {
        await newPackage.save();
      }

      createdPackages.push(newPackage);
    }

    return createdPackages;
  }
}
