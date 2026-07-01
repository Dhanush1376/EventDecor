import mongoose, { Schema, Document } from 'mongoose';
import ForensicAuditPlugin from '../utils/ForensicAuditPlugin';

export interface IReturnPolicy extends Document {
  enableReturns: boolean;
  enableExchanges: boolean;
  enableRefunds: boolean;

  defaultReturnWindow: number;
  defaultExchangeWindow: number;

  categoryRules: {
    category: string;
    returnWindow: number;
    exchangeWindow: number;
    isNonRefundable: boolean;
  }[];

  refundRules: {
    defaultRestockingFeePercent: number;
    refundShippingCost: boolean;
    allowStoreCreditRefund: boolean;
    allowWalletRefund: boolean;
  };

  pickupRules: {
    maxPickupAttempts: number;
    blackoutDates: Date[];
    allowCustomerDropoff: boolean;
  };

  inspectionRules: {
    inspectionRequiredByDefault: boolean;
    autoApproveBelowAmount: number;
  };

  holidayBlackoutDates: Date[];

  approvalThresholds: {
    maxAmount: number;
    level: 'auto' | 'manager' | 'senior_admin';
  }[];

  fraudThresholds: {
    highRiskScore: number;
    maxReturnsPerMonth: number;
    autoBlockHighRisk: boolean;
  };

  slaConfig: {
    [stage: string]: number; // max hours allowed in stage before overdue
  };

  updatedAt: Date;
}

const ReturnPolicySchema = new Schema<IReturnPolicy>(
  {
    enableReturns: { type: Boolean, default: true },
    enableExchanges: { type: Boolean, default: true },
    enableRefunds: { type: Boolean, default: true },

    defaultReturnWindow: { type: Number, default: 7 },
    defaultExchangeWindow: { type: Number, default: 7 },

    categoryRules: [
      {
        category: { type: String },
        returnWindow: { type: Number },
        exchangeWindow: { type: Number },
        isNonRefundable: { type: Boolean, default: false },
      },
    ],

    refundRules: {
      defaultRestockingFeePercent: { type: Number, default: 0 },
      refundShippingCost: { type: Boolean, default: false },
      allowStoreCreditRefund: { type: Boolean, default: true },
      allowWalletRefund: { type: Boolean, default: true },
    },

    pickupRules: {
      maxPickupAttempts: { type: Number, default: 3 },
      blackoutDates: [{ type: Date }],
      allowCustomerDropoff: { type: Boolean, default: false },
    },

    inspectionRules: {
      inspectionRequiredByDefault: { type: Boolean, default: true },
      autoApproveBelowAmount: { type: Number, default: 0 },
    },

    holidayBlackoutDates: [{ type: Date }],

    approvalThresholds: [
      {
        maxAmount: { type: Number },
        level: { type: String, enum: ['auto', 'manager', 'senior_admin'] },
      },
    ],

    fraudThresholds: {
      highRiskScore: { type: Number, default: 80 },
      maxReturnsPerMonth: { type: Number, default: 3 },
      autoBlockHighRisk: { type: Boolean, default: false },
    },

    slaConfig: {
      type: Map,
      of: Number,
      default: {
        submitted: 24, // 24 hours to approve
        approved: 48, // 48 hours to schedule pickup
        pickup_assigned: 72, // 3 days to complete pickup
        picked_up: 72, // 3 days to reach warehouse
        reached_warehouse: 48, // 48 hours to inspect
        inspection_passed: 24, // 24 hours to trigger refund
      },
    },
  },
  {
    timestamps: true,
  },
);

ReturnPolicySchema.plugin(ForensicAuditPlugin);

const ReturnPolicy = mongoose.model<IReturnPolicy>('ReturnPolicy', ReturnPolicySchema);

export default ReturnPolicy;
