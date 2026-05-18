import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamInvite extends Document {
  email: string;
  role: 'admin' | 'manager' | 'coordinator';
  permissions: string;
  status: 'pending' | 'accepted' | 'declined';
  token: string;
  invitedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamInviteSchema: Schema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { 
      type: String, 
      enum: ['admin', 'manager', 'coordinator'], 
      default: 'manager' 
    },
    permissions: { type: String, default: 'Full Access' },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'declined'], 
      default: 'pending' 
    },
    token: { type: String, required: true, unique: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

TeamInviteSchema.index({ email: 1 });

const TeamInvite = mongoose.model<ITeamInvite>('TeamInvite', TeamInviteSchema);

export default TeamInvite;
