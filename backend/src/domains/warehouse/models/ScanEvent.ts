import mongoose, { Schema, Model } from 'mongoose';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { IScanEvent } from '../types/scanEvent';

const ScanEventSchema = new Schema(
  {
    scanId: { type: String, required: true, unique: true, index: true },
    scanType: { type: String, enum: ['barcode', 'qr'], required: true },
    rawValue: { type: String, required: true },
    entityType: {
      type: String,
      enum: [
        'product',
        'order',
        'package',
        'shipment',
        'bin',
        'transaction',
        'rental',
        'event',
        'custom',
      ],
      required: true,
    },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', index: true },
    domain: { type: String, enum: ['purchase', 'rental', 'event', 'custom'], index: true },
    entityId: { type: Schema.Types.Mixed, required: true, index: true },
    action: {
      type: String,
      enum: ['receive', 'pick', 'pack', 'verify', 'ship', 'deliver', 'return_receive'],
      required: true,
      index: true,
    },
    result: {
      type: String,
      enum: ['success', 'mismatch', 'not_found', 'already_scanned', 'error'],
      required: true,
      index: true,
    },
    scannedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true },
      role: { type: String, required: true },
    },
    deviceType: {
      type: String,
      enum: ['usb', 'bluetooth', 'camera', 'industrial'],
      required: true,
    },
    location: {
      warehouseId: { type: String },
      zoneId: { type: String },
    },
    isOfflineSync: { type: Boolean, default: false },
    originalTimestamp: { type: Date },
    timestamp: { type: Date, default: Date.now, index: true },
    linkedEvents: {
      inventoryEventId: { type: Schema.Types.ObjectId, ref: 'InventoryEvent' },
      orderEventId: { type: Schema.Types.ObjectId, ref: 'OrderEvent' },
      notificationId: { type: Schema.Types.ObjectId, ref: 'NotificationLog' },
    },
    voiceConfirmation: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

ScanEventSchema.index({ timestamp: -1 });

// Event sourcing models MUST be append-only, NO soft deletes allowed.
ScanEventSchema.plugin(ForensicAuditPlugin);

const ScanEvent = mongoose.model<IScanEvent, Model<IScanEvent>>('ScanEvent', ScanEventSchema);

export default ScanEvent;
