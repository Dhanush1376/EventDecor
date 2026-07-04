import mongoose from 'mongoose';

export type PackageSize = 'small' | 'medium' | 'large' | 'custom';

export interface IBin {
  binId: string;
  code: string;
  fullPath: string;
  capacity: {
    max: number;
    current: number;
  };
  productIds: mongoose.Types.ObjectId[];
  status: 'available' | 'full' | 'reserved' | 'maintenance';
}

export interface IShelf {
  shelfId: string;
  code: string;
  bins: IBin[];
}

export interface IAisle {
  aisleId: string;
  code: string;
  shelves: IShelf[];
}

export interface IZone {
  zoneId: string;
  code: string;
  name: string;
  type: 'storage' | 'receiving' | 'packing' | 'shipping' | 'returns';
  aisles: IAisle[];
}

export interface IWarehouse extends mongoose.Document {
  warehouseId: string;
  code: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  isDefault: boolean;
  isActive: boolean;
  capacity: {
    totalBins: number;
    usedBins: number;
    utilizationPercent: number;
  };
  operatingHours: {
    open: string;
    close: string;
    timezone: string;
    holidays: Date[];
  };
  contactPerson?: {
    name: string;
    phone: string;
    email: string;
  };
  zones: IZone[];
  createdAt: Date;
  updatedAt: Date;
}
