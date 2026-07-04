import mongoose from 'mongoose';

export interface IScanEvent extends mongoose.Document {
  scanId: string;
  scanType: 'barcode' | 'qr';
  rawValue: string;
  entityType:
    | 'product'
    | 'order'
    | 'package'
    | 'shipment'
    | 'bin'
    | 'location'
    | 'operational'
    | 'unknown'
    | 'transaction'
    | 'rental'
    | 'event'
    | 'custom';
  transactionId?: mongoose.Types.ObjectId;
  domain?: 'purchase' | 'rental' | 'event' | 'custom';
  entityId?: mongoose.Types.ObjectId | string;
  metadata?: any;
  errorMessage?: string;
  action: 'receive' | 'pick' | 'pack' | 'verify' | 'ship' | 'deliver' | 'return_receive';
  result: 'success' | 'mismatch' | 'not_found' | 'already_scanned' | 'error';
  scannedBy: {
    userId: mongoose.Types.ObjectId;
    name: string;
    role: string;
  };
  deviceType: 'usb' | 'bluetooth' | 'camera' | 'industrial';
  location?: {
    warehouseId?: string;
    zoneId?: string;
  };
  isOfflineSync: boolean;
  originalTimestamp?: Date;
  timestamp: Date;
  linkedEvents: {
    inventoryEventId?: mongoose.Types.ObjectId;
    orderEventId?: mongoose.Types.ObjectId;
    notificationId?: mongoose.Types.ObjectId;
  };
  voiceConfirmation: boolean;
  createdAt: Date;
  updatedAt: Date;
}
