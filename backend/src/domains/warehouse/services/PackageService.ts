import mongoose from 'mongoose';
import Package from '../models/Package';
import { PackagingCalculator } from './PackagingCalculator';
import Counter from '../../../models/Counter';

async function generateSequentialPackageId(session?: mongoose.ClientSession): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const counterId = `pkg_seq_${dateStr}`;

  let counter;
  if (session) {
    counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session },
    );
  } else {
    counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
  }

  const seqStr = counter.seq.toString().padStart(6, '0');
  return `PKG-${dateStr}-${seqStr}`;
}

export class PackageService {
  /**
   * Auto-generates packages for an order based on optimal packaging rules
   */
  static async autoPackOrder(orderId: string, session?: mongoose.ClientSession) {
    const proposal = await PackagingCalculator.calculateForOrder(orderId);
    const createdPackages = [];

    for (const pkg of proposal.packages) {
      const packageId = await generateSequentialPackageId(session);

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
        packageType: pkg.size === 'small' ? 'standard' : 'oversized', // Basic mapping
        status: 'created',
        barcode: packageId,
        version: 0,
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
