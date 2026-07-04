import Order from '../../../models/Order';
import { PackageSize } from '../types/warehouse';

export interface PackingProposal {
  orderId: string;
  packages: Array<{
    size: PackageSize;
    weight: number;
    items: Array<{
      productId: string;
      sku: string;
      quantity: number;
    }>;
  }>;
}

export class PackagingCalculator {
  /**
   * Calculates the optimal packaging for an order based on product dimensions and weights.
   * This is a simplified 3D bin packing heuristic.
   */
  static async calculateForOrder(orderId: string): Promise<PackingProposal> {
    const order = await Order.findById(orderId).populate('items.productId');
    if (!order) throw new Error('Order not found');

    const proposal: PackingProposal = {
      orderId,
      packages: [],
    };

    let currentPackageItems: any[] = [];
    let currentWeight = 0;
    let currentVolume = 0;

    // Standard box volumes (Length x Width x Height in cm^3)
    const BOX_LIMITS = {
      small: { volume: 20 * 20 * 15, weight: 2 }, // 2kg max
      medium: { volume: 40 * 30 * 20, weight: 5 }, // 5kg max
      large: { volume: 60 * 40 * 40, weight: 15 }, // 15kg max
      custom: { volume: Infinity, weight: Infinity },
    };

    for (const item of order.items) {
      const product = item.productId as any;
      if (!product) continue;

      const qty = item.quantity;
      for (let i = 0; i < qty; i++) {
        const pWeight = product.weight || 0.5; // Default 0.5kg
        const pVol =
          (product.dimensions?.length || 10) *
          (product.dimensions?.width || 10) *
          (product.dimensions?.height || 10);

        // If adding this item exceeds large box limits, close current package and start new one
        if (
          currentWeight + pWeight > BOX_LIMITS.large.weight ||
          currentVolume + pVol > BOX_LIMITS.large.volume
        ) {
          if (currentPackageItems.length > 0) {
            proposal.packages.push(
              this.createPackageObject(
                currentPackageItems,
                currentWeight,
                currentVolume,
                BOX_LIMITS,
              ),
            );
            currentPackageItems = [];
            currentWeight = 0;
            currentVolume = 0;
          }
        }

        currentPackageItems.push({
          productId: product._id.toString(),
          sku: product.sku || `SKU-${product._id}`,
          quantity: 1, // We added one by one for calculation
        });
        currentWeight += pWeight;
        currentVolume += pVol;
      }
    }

    if (currentPackageItems.length > 0) {
      proposal.packages.push(
        this.createPackageObject(currentPackageItems, currentWeight, currentVolume, BOX_LIMITS),
      );
    }

    // Consolidate identical items in packages
    proposal.packages.forEach((pkg) => {
      const consolidated: Record<string, any> = {};
      pkg.items.forEach((item) => {
        if (!consolidated[item.sku]) consolidated[item.sku] = { ...item, quantity: 0 };
        consolidated[item.sku].quantity++;
      });
      pkg.items = Object.values(consolidated);
    });

    return proposal;
  }

  private static createPackageObject(items: any[], weight: number, volume: number, limits: any) {
    let size: PackageSize = 'custom';
    if (weight <= limits.small.weight && volume <= limits.small.volume) size = 'small';
    else if (weight <= limits.medium.weight && volume <= limits.medium.volume) size = 'medium';
    else if (weight <= limits.large.weight && volume <= limits.large.volume) size = 'large';

    return {
      size,
      weight: parseFloat(weight.toFixed(2)),
      items,
    };
  }
}
