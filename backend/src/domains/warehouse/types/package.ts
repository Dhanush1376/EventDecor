import mongoose from 'mongoose';

export interface IPackageItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
  quantity: number;
  variantId?: string;
  verified: boolean;
}

export interface IPackage extends mongoose.Document {
  packageId: string;
  orderId: mongoose.Types.ObjectId;
  packageNumber: number;
  totalPackages: number;
  items: IPackageItem[];
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  packageType: 'standard' | 'fragile' | 'oversized' | 'custom';
  doublePackaging: boolean;
  qrCode?: string;
  qrSignature?: string;
  shippingLabel?: {
    url: string;
    generatedAt: Date;
  };
  photos?: {
    items: string[];
    sealed: string[];
    label: string[];
  };
  status: 'created' | 'items_verified' | 'sealed' | 'labeled' | 'ready_for_pickup' | 'shipped';
  packedBy?: {
    userId: mongoose.Types.ObjectId;
    name: string;
  };
  sealedAt?: Date;
  labeledAt?: Date;
  shipmentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
