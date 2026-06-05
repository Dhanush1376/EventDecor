import mongoose, { Schema, Document } from 'mongoose';

export interface IOutboxEvent extends Document {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: any;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  retryCount: number;
  errorDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OutboxEventSchema: Schema = new Schema(
  {
    aggregateId: { type: String, required: true },
    aggregateType: { type: String, required: true },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PUBLISHED', 'FAILED'],
      default: 'PENDING',
    },
    retryCount: { type: Number, default: 0 },
    errorDetails: { type: String },
  },
  { timestamps: true },
);

OutboxEventSchema.index({ status: 1, createdAt: 1 });
OutboxEventSchema.index({ aggregateId: 1, aggregateType: 1 });

const OutboxEvent = mongoose.model<IOutboxEvent>('OutboxEvent', OutboxEventSchema);
export default OutboxEvent;
