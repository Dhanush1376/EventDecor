import mongoose from 'mongoose';

export type OrderEventType =
  | 'payment_received'
  | 'inventory_reserved'
  | 'production_started'
  | 'raw_material_reserved'
  | 'craft_started'
  | 'painting'
  | 'drying'
  | 'decoration'
  | 'quality_inspection_started'
  | 'quality_inspection_passed'
  | 'quality_inspection_failed'
  | 'moved_to_packaging_queue'
  | 'pick_list_created'
  | 'picking_started'
  | 'item_picked'
  | 'picking_completed'
  | 'packing_started'
  | 'item_verified'
  | 'package_sealed'
  | 'label_printed'
  | 'package_qr_generated'
  | 'packing_completed'
  | 'courier_assigned'
  | 'courier_picked_up'
  | 'reached_local_hub'
  | 'reached_regional_hub'
  | 'in_transit'
  | 'reached_destination_hub'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_confirmed'
  | 'return_requested'
  | 'return_approved'
  | 'return_courier_assigned'
  | 'return_picked_up'
  | 'return_received'
  | 'return_inspection_started'
  | 'return_inspection_completed'
  | 'refund_initiated'
  | 'refund_completed'
  | 'inventory_decision_made'
  | 'cancelled'
  | 'manual_override'
  | 'reservation_expired';

export interface IOrderEvent extends mongoose.Document {
  eventId: string;
  orderId: mongoose.Types.ObjectId;
  orderType: 'purchase' | 'rental' | 'custom';
  eventType: OrderEventType;
  timestamp: Date;
  performedBy: {
    userId?: mongoose.Types.ObjectId;
    name: string;
    role: string;
  };
  source: 'system' | 'admin' | 'warehouse' | 'courier' | 'customer';
  location?: {
    warehouseId?: string;
    city?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  metadata?: any;
  photos?: string[];
  previousEventId?: mongoose.Types.ObjectId;
  signature: string;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
}
