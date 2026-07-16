import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWhatsAppRoleMap extends Document {
  userId: Types.ObjectId;
  roleId: Types.ObjectId;
  assignedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppRoleMapSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'WhatsAppRole', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export default mongoose.model<IWhatsAppRoleMap>('WhatsAppRoleMap', WhatsAppRoleMapSchema);
