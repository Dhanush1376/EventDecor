import mongoose, { Schema, Document } from 'mongoose';

export interface IBookingMessage extends Document {
  bookingId: mongoose.Types.ObjectId;
  sender: 'client' | 'admin';
  message: string;
  timestamp: Date;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BookingMessageSchema: Schema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'EventBooking', required: true },
    sender: { type: String, enum: ['client', 'admin'], required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

BookingMessageSchema.index({ bookingId: 1, timestamp: 1 });

const BookingMessage = mongoose.model<IBookingMessage>('BookingMessage', BookingMessageSchema);
export default BookingMessage;
