import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { IWarehouse } from '../types/warehouse';

const WarehouseSchema = new Schema(
  {
    warehouseId: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    capacity: {
      totalBins: { type: Number, default: 0 },
      usedBins: { type: Number, default: 0 },
      utilizationPercent: { type: Number, default: 0 },
    },
    operatingHours: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      holidays: [{ type: Date }],
    },
    contactPerson: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
    },
    zones: [
      {
        zoneId: { type: String, required: true },
        code: { type: String, required: true },
        name: { type: String, required: true },
        type: {
          type: String,
          enum: ['storage', 'receiving', 'packing', 'shipping', 'returns'],
          default: 'storage',
        },
        aisles: [
          {
            aisleId: { type: String, required: true },
            code: { type: String, required: true },
            shelves: [
              {
                shelfId: { type: String, required: true },
                code: { type: String, required: true },
                bins: [
                  {
                    binId: { type: String, required: true },
                    code: { type: String, required: true },
                    fullPath: { type: String, required: true },
                    capacity: {
                      max: { type: Number, default: 100 },
                      current: { type: Number, default: 0 },
                    },
                    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
                    status: {
                      type: String,
                      enum: ['available', 'full', 'reserved', 'maintenance'],
                      default: 'available',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes
WarehouseSchema.index({ isDefault: 1 });
WarehouseSchema.index({ 'zones.zoneId': 1 });
WarehouseSchema.index({ 'zones.aisles.shelves.bins.binId': 1 });
WarehouseSchema.index({ 'zones.aisles.shelves.bins.fullPath': 1 });

// Plugins
WarehouseSchema.plugin(SoftDeletePlugin);
WarehouseSchema.plugin(ForensicAuditPlugin);

const Warehouse = mongoose.model<IWarehouse, SoftDeleteModel<IWarehouse>>(
  'Warehouse',
  WarehouseSchema,
);

export default Warehouse;
