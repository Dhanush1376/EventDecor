import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreSettings extends Document {
  general: {
    storeName: string;
    announcementText: string;
    announcementLink: string;
    maintenanceMode: boolean; // Retained for backward compatibility
    maintenanceConfigRef?: mongoose.Types.ObjectId;
    storeEnabled: boolean;
  };
  shipping: {
    deliveryCharge: number;
    freeShippingThreshold: number;
    enableFreeShipping: boolean;
    expressDeliveryCharge: number;
    enableExpressDelivery: boolean;
    packagingFee: number;
    remoteAreaCharge: number;
    estimatedDeliveryDays: string;
    maxShippingDistance: number;
    enableLocalDelivery: boolean;
    originPincode: string;
  };
  payments: {
    enableCOD: boolean;
    codFee: number;
    codMinOrder: number;
    codMaxOrder: number;
    enableRazorpay: boolean;
    enableWallet: boolean;
    enableUPI: boolean;
    enableNetBanking: boolean;
    enableCards: boolean;
    enableEMI: boolean;
  };
  returnsExchanges: {
    enableReturns: boolean;
    enableExchanges: boolean;
    returnWindowDays: number;
    exchangeWindowDays: number;
    returnProcessingDays: string;
    refundProcessingDays: string;
    requireImages: boolean;
    pickupAvailable: boolean;
    storeCreditOption: boolean;
  };
  cancellation: {
    allowCancellation: boolean;
    cancellationWindowHours: number;
    refundTimeline: string;
    walletRefund: boolean;
    originalPaymentRefund: boolean;
  };
  taxes: {
    gstEnabled: boolean;
    gstRate: number;
    cgstRate: number;
    sgstRate: number;
    invoicePrefix: string;
    hsnCode: string;
    gstNumber: string;
    taxInclusive: boolean;
  };
  loyalty: {
    walletEnabled: boolean;
    referralProgramEnabled: boolean;
    reviewRewardsEnabled: boolean;
    welcomeBonusEnabled: boolean;
    pointsPerRupee: number;
    coinsPerRupee: number;
    welcomeBonus: number;
    referralBonusReferrer: number;
    referralBonusReferee: number;
    reviewRewardText: number;
    reviewRewardPhoto: number;
    reviewRewardVideo: number;
    reviewCoinsBonus: number;
    welcomeCouponDiscount: number;
    welcomeCouponMinOrder: number;
    welcomeCouponMaxDiscount: number;
    welcomeCouponExpiryDays: number;
    tiers: Array<{
      name: string;
      minSpend: number;
      cashbackRate: number;
    }>;
  };
  orders: {
    maxItemsPerOrder: number;
    maxQuantityPerItem: number;
    minOrderValue: number;
    maxOrderValue: number;
    platformFee: number;
  };
  contact: {
    phone: string;
    email: string;
    supportHours: string;
    address: string;
    googleMapsUrl: string;
    instagram: string;
    facebook: string;
    pinterest: string;
    youtube: string;
    whatsappNumber: string;
    whatsappMessage: string;
  };
  legal: {
    companyName: string;
    registeredAddress: string;
    cin: string;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    whatsappEnabled: boolean;
  };
  storefront: {
    seoTitle: string;
    seoDescription: string;
  };
  version: number;
  lastModifiedBy?: mongoose.Types.ObjectId;
  auditLog: Array<{
    timestamp: Date;
    adminId?: mongoose.Types.ObjectId;
    changes: any;
  }>;
}

const StoreSettingsSchema: Schema = new Schema(
  {
    general: {
      storeName: { type: String, default: 'Siri Arts & Crafts' },
      announcementText: { type: String, default: '' },
      announcementLink: { type: String, default: '' },
      maintenanceMode: { type: Boolean, default: false },
      maintenanceConfigRef: { type: Schema.Types.ObjectId, ref: 'MaintenanceConfig' },
      storeEnabled: { type: Boolean, default: true },
    },
    shipping: {
      deliveryCharge: { type: Number, default: 100 },
      freeShippingThreshold: { type: Number, default: 2000 },
      enableFreeShipping: { type: Boolean, default: true },
      expressDeliveryCharge: { type: Number, default: 249 },
      enableExpressDelivery: { type: Boolean, default: false },
      packagingFee: { type: Number, default: 0 },
      remoteAreaCharge: { type: Number, default: 0 },
      estimatedDeliveryDays: { type: String, default: '5-7' },
      maxShippingDistance: { type: Number, default: 0 },
      enableLocalDelivery: { type: Boolean, default: false },
      // Warehouse dispatch origin — used as the source pincode for delivery
      // estimation. Defaults to the store's registered Ongole location.
      originPincode: { type: String, default: '523001' },
    },
    payments: {
      enableCOD: { type: Boolean, default: true },
      codFee: { type: Number, default: 90 },
      codMinOrder: { type: Number, default: 500 },
      codMaxOrder: { type: Number, default: 50000 },
      enableRazorpay: { type: Boolean, default: true },
      enableWallet: { type: Boolean, default: true },
      enableUPI: { type: Boolean, default: true },
      enableNetBanking: { type: Boolean, default: true },
      enableCards: { type: Boolean, default: true },
      enableEMI: { type: Boolean, default: false },
    },
    returnsExchanges: {
      enableReturns: { type: Boolean, default: true },
      enableExchanges: { type: Boolean, default: true },
      returnWindowDays: { type: Number, default: 7 },
      exchangeWindowDays: { type: Number, default: 7 },
      returnProcessingDays: { type: String, default: '3-5' },
      refundProcessingDays: { type: String, default: '5-7 business days' },
      requireImages: { type: Boolean, default: true },
      pickupAvailable: { type: Boolean, default: true },
      storeCreditOption: { type: Boolean, default: true },
    },
    cancellation: {
      allowCancellation: { type: Boolean, default: true },
      cancellationWindowHours: { type: Number, default: 24 },
      refundTimeline: { type: String, default: '5-7 business days' },
      walletRefund: { type: Boolean, default: true },
      originalPaymentRefund: { type: Boolean, default: true },
    },
    taxes: {
      gstEnabled: { type: Boolean, default: true },
      gstRate: { type: Number, default: 0.18 }, // 18%
      cgstRate: { type: Number, default: 0.09 }, // 9%
      sgstRate: { type: Number, default: 0.09 }, // 9%
      invoicePrefix: { type: String, default: 'INV-' },
      hsnCode: { type: String, default: '' },
      gstNumber: { type: String, default: '29AAAES9284D1ZX' },
      taxInclusive: { type: Boolean, default: true },
    },
    loyalty: {
      walletEnabled: { type: Boolean, default: true },
      referralProgramEnabled: { type: Boolean, default: true },
      reviewRewardsEnabled: { type: Boolean, default: true },
      welcomeBonusEnabled: { type: Boolean, default: true },
      pointsPerRupee: { type: Number, default: 0 },
      coinsPerRupee: { type: Number, default: 0.1 }, // 1 coin per 10 rupees
      welcomeBonus: { type: Number, default: 100 },
      referralBonusReferrer: { type: Number, default: 150 },
      referralBonusReferee: { type: Number, default: 50 },
      reviewRewardText: { type: Number, default: 10 },
      reviewRewardPhoto: { type: Number, default: 25 },
      reviewRewardVideo: { type: Number, default: 50 },
      reviewCoinsBonus: { type: Number, default: 15 },
      welcomeCouponDiscount: { type: Number, default: 10 },
      welcomeCouponMinOrder: { type: Number, default: 499 },
      welcomeCouponMaxDiscount: { type: Number, default: 200 },
      welcomeCouponExpiryDays: { type: Number, default: 30 },
      tiers: [
        {
          name: { type: String, required: true },
          minSpend: { type: Number, required: true },
          cashbackRate: { type: Number, required: true },
        },
      ],
    },
    orders: {
      maxItemsPerOrder: { type: Number, default: 20 },
      maxQuantityPerItem: { type: Number, default: 50 },
      minOrderValue: { type: Number, default: 0 },
      maxOrderValue: { type: Number, default: 1000000 },
      platformFee: { type: Number, default: 0 },
    },
    contact: {
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      supportHours: { type: String, default: 'Mon - Sat, 10 AM to 6 PM' },
      address: {
        type: String,
        default: '#28-1-92, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh',
      },
      googleMapsUrl: { type: String, default: '' },
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      pinterest: { type: String, default: '' },
      youtube: { type: String, default: '' },
      whatsappNumber: { type: String, default: '' },
      whatsappMessage: { type: String, default: '' },
    },
    legal: {
      companyName: { type: String, default: 'Siri Arts & Crafts' },
      registeredAddress: { type: String, default: '' },
      cin: { type: String, default: '' },
    },
    notifications: {
      emailEnabled: { type: Boolean, default: true },
      smsEnabled: { type: Boolean, default: false },
      whatsappEnabled: { type: Boolean, default: true },
    },
    storefront: {
      seoTitle: { type: String, default: 'Siri Arts & Crafts' },
      seoDescription: { type: String, default: 'Premium Handicrafts and Studio' },
    },
    version: { type: Number, default: 1 },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    auditLog: [
      {
        timestamp: { type: Date, default: Date.now },
        adminId: { type: Schema.Types.ObjectId, ref: 'User' },
        changes: { type: Schema.Types.Mixed },
      },
    ],
  },
  { timestamps: true },
);

// Ensure only one document can exist using a static method or pre-save hook
StoreSettingsSchema.pre('save', async function () {
  if (this.isNew) {
    const count = await mongoose.model('StoreSettings').countDocuments();
    if (count >= 1) {
      throw new Error('Only one StoreSettings document can exist');
    }
  }
});

export default mongoose.model<IStoreSettings>('StoreSettings', StoreSettingsSchema);
