import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomerNote extends Document {
  customerId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorRole: string;
  content: string;
  isPinned: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CustomerNoteSchema: Schema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, required: true },
    content: { type: String, required: true, maxlength: 2000 },
    isPinned: { type: Boolean, default: false },
    tags: [{ type: String }],
  },
  { timestamps: true },
);

CustomerNoteSchema.index({ customerId: 1, createdAt: -1 });
CustomerNoteSchema.index({ customerId: 1, isPinned: -1 });

const CustomerNote = mongoose.model<ICustomerNote>('CustomerNote', CustomerNoteSchema);
export default CustomerNote;
