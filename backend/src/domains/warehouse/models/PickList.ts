import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPickListItem {
  productId: Types.ObjectId;
  sku: string;
  quantity: number;
  pickedQuantity: number;
  location: {
    zone: string;
    aisle: string;
    shelf: string;
    bin: string;
  };
  orderId: Types.ObjectId;
  status: 'pending' | 'partial' | 'picked' | 'missing';
}

export interface IPickList extends Document {
  pickListId: string;
  assignedTo: Types.ObjectId;
  items: IPickListItem[];
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PickListItemSchema = new Schema<IPickListItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  pickedQuantity: { type: Number, default: 0 },
  location: {
    zone: { type: String },
    aisle: { type: String },
    shelf: { type: String },
    bin: { type: String },
  },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  status: { type: String, enum: ['pending', 'partial', 'picked', 'missing'], default: 'pending' },
});

const PickListSchema = new Schema<IPickList>(
  {
    pickListId: { type: String, required: true, unique: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [PickListItemSchema],
    status: {
      type: String,
      enum: ['assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'assigned',
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

PickListSchema.index({ pickListId: 1 }, { unique: true });
PickListSchema.index({ assignedTo: 1, status: 1 });
PickListSchema.index({ 'items.orderId': 1 });

export default mongoose.models.PickList || mongoose.model<IPickList>('PickList', PickListSchema);
