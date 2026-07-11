import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { BaseEntityPlugin, IBaseEntity } from '../../../utils/BaseEntityPlugin';

export interface IPackageItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface IPackage extends IBaseEntity {
  packageId: string;
  orderId: mongoose.Types.ObjectId;
  items: IPackageItem[];
  dimensions: {
    length: number; // cm
    width: number; // cm
    height: number; // cm
  };
  weight: number; // kg
  volumetricWeight: number; // kg
  packingMaterial?: string;
  isFragile: boolean;
  barcode?: string;
  qrCode?: string;
  images: string[];
  status: 'packed' | 'ready_for_dispatch' | 'dispatched';
  createdAt: Date;
  updatedAt: Date;
}

const PackageSchema = new Schema(
  {
    packageId: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    dimensions: {
      length: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    weight: { type: Number, required: true },
    volumetricWeight: { type: Number },
    packingMaterial: { type: String },
    isFragile: { type: Boolean, default: false },
    barcode: { type: String },
    qrCode: { type: String },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['packed', 'ready_for_dispatch', 'dispatched'],
      default: 'packed',
      index: true,
    },
  },
  { timestamps: true },
);

// Calculate volumetric weight before save (L*W*H / 5000 is standard)
PackageSchema.pre('save', function () {
  const doc = this as unknown as IPackage;
  if (doc.dimensions && doc.dimensions.length && doc.dimensions.width && doc.dimensions.height) {
    doc.volumetricWeight =
      (doc.dimensions.length * doc.dimensions.width * doc.dimensions.height) / 5000;
  }
});

PackageSchema.plugin(SoftDeletePlugin);
PackageSchema.plugin(ForensicAuditPlugin);
PackageSchema.plugin(BaseEntityPlugin);

const Package = mongoose.model<IPackage, SoftDeleteModel<IPackage>>('Package', PackageSchema);

export default Package;
