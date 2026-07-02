import mongoose, { Schema, Document } from 'mongoose';
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';

export type MaintenanceMode = 'off' | 'public_maintenance' | 'read_only' | 'full_lockdown';

export interface IMaintenanceConfig extends Document {
  mode: MaintenanceMode;
  enabledAt: Date | null;
  enabledBy: mongoose.Types.ObjectId | null;
  reason: string;
  estimatedDuration: number; // in minutes
  allowedIps: string[]; // Future-ready
  notifyOnDisable: boolean;
  version: number;
}

const MaintenanceConfigSchema: Schema = new Schema(
  {
    mode: {
      type: String,
      enum: ['off', 'public_maintenance', 'read_only', 'full_lockdown'],
      default: 'off',
      required: true,
    },
    enabledAt: { type: Date, default: null },
    enabledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, default: 'Scheduled system maintenance' },
    estimatedDuration: { type: Number, default: 60 },
    allowedIps: { type: [String], default: [] },
    notifyOnDisable: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

// Ensure only one document can exist
MaintenanceConfigSchema.pre('save', async function () {
  if (this.isNew) {
    const count = await mongoose.model('MaintenanceConfig').countDocuments();
    if (count >= 1) {
      throw new Error('Only one MaintenanceConfig document can exist');
    }
  }
});

MaintenanceConfigSchema.plugin(ForensicAuditPlugin);

const MaintenanceConfig = mongoose.model<IMaintenanceConfig>(
  'MaintenanceConfig',
  MaintenanceConfigSchema,
);

export default MaintenanceConfig;
