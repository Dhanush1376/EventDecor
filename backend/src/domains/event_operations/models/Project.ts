import mongoose, { Schema } from 'mongoose';
import SoftDeletePlugin, { SoftDeleteModel } from '../../../utils/SoftDeletePlugin';
import ForensicAuditPlugin from '../../../utils/ForensicAuditPlugin';
import { BaseEntityPlugin, IBaseEntity } from '../../../utils/BaseEntityPlugin';

export interface IProject extends IBaseEntity {
  name: string;
  description?: string;
  client: mongoose.Types.ObjectId; // User ref
  status:
    | 'lead'
    | 'quoted'
    | 'negotiation'
    | 'confirmed'
    | 'planning'
    | 'production'
    | 'execution'
    | 'completed'
    | 'archived'
    | 'cancelled';
  expectedStartDate?: Date;
  expectedEndDate?: Date;
  budget?: number;
  eventJobs: mongoose.Types.ObjectId[]; // EventJob refs
  orders: mongoose.Types.ObjectId[]; // Order refs
  invoices: mongoose.Types.ObjectId[]; // Invoice refs
  statusHistory: Array<{
    status: string;
    changedAt: Date;
    changedBy?: string;
    note?: string;
  }>;
}

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: [
        'lead',
        'quoted',
        'negotiation',
        'confirmed',
        'planning',
        'production',
        'execution',
        'completed',
        'archived',
        'cancelled',
      ],
      default: 'lead',
      index: true,
    },
    expectedStartDate: { type: Date },
    expectedEndDate: { type: Date },
    budget: { type: Number },
    eventJobs: [{ type: Schema.Types.ObjectId, ref: 'EventJob' }],
    orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    invoices: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        note: { type: String },
      },
    ],
  },
  { timestamps: true },
);

// State Transition Enforcement
ProjectSchema.pre('save', async function () {
  const doc = this as unknown as IProject & {
    isModified: (path: string) => boolean;
    _original?: any;
  };

  if (doc.isModified('status')) {
    // Valid transitions enforcement logic to be implemented.
    // Need to safely check original status if implementing strict enforcement.
    // In Mongoose, pre('save') can access doc before it's saved.
    // For now, we just push to statusHistory.
    doc.statusHistory.push({
      status: doc.status,
      changedAt: new Date(),
      note: 'Status updated',
    });
  }
});

ProjectSchema.plugin(SoftDeletePlugin);
ProjectSchema.plugin(ForensicAuditPlugin);
ProjectSchema.plugin(BaseEntityPlugin);

const Project = mongoose.model<IProject, SoftDeleteModel<IProject>>('Project', ProjectSchema);

export default Project;
