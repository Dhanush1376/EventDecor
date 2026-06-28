import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalyticsSnapshot extends Document {
  snapshotDate: Date;
  type: 'daily' | 'weekly' | 'monthly';
  metrics: {
    // Core KPIs
    totalCustomers: number;
    newCustomers: number;
    activeCustomers: number;
    returningCustomers: number;
    totalRevenue: number;
    orderCount: number;
    avgOrderValue: number;
    rentalRevenue: number;
    purchaseRevenue: number;
    customOrderRevenue: number;
    cartAbandonmentRate: number;
    checkoutCompletionRate: number;

    // Search Intelligence
    topSearches: Array<{ query: string; count: number; intent?: string }>;
    zeroResultSearches: Array<{ query: string; count: number }>;
    searchSuccessRate: number;
    searchToClickRate: number;
    searchToPurchaseRate: number;

    // Product Intelligence
    topProducts: Array<{
      productId: mongoose.Types.ObjectId | string;
      views: number;
      clicks: number;
      purchases: number;
      revenue: number;
      conversionRate: number;
    }>;
    productAffinities: Array<{
      productA: mongoose.Types.ObjectId | string;
      productB: mongoose.Types.ObjectId | string;
      cooccurrenceCount: number;
      confidence: number;
    }>;

    // Customer Segments
    customerSegments: {
      highValue: number;
      returning: number;
      new: number;
      inactive: number;
      cartAbandoners: number;
      frequentBuyers: number;
      rentalFocused: number;
      couponHeavy: number;
      premium: number;
      vip: number;
      atRisk: number;
      churnRisk: number;
      referralChampions: number;
    };

    // Funnel Metrics
    funnelMetrics: {
      homepage: number;
      category: number;
      product: number;
      cart: number;
      checkout: number;
      payment: number;
      orderSuccess: number;
      dropoffs: {
        homepageToCategory: number;
        categoryToProduct: number;
        productToCart: number;
        cartToCheckout: number;
        checkoutToPayment: number;
        paymentToSuccess: number;
      };
      avgCompletionTimeMs: number;
    };

    // Marketing Attribution
    trafficSources: Array<{
      channel: string;
      visitors: number;
      conversions: number;
      revenue: number;
    }>;

    // Cohort Analysis
    cohortRetention: Array<{ cohortMonth: string; [key: string]: string | number }>;

    // Recommendation Effectiveness
    recommendationMetrics: {
      shown: number;
      clicked: number;
      carted: number;
      purchased: number;
      clickRate: number;
      cartRate: number;
      purchaseRate: number;
      revenue: number;
    };

    // AI Insights
    aiInsights: Array<{
      category: string;
      message: string;
      severity: 'positive' | 'info' | 'warning' | 'negative';
      metric: string;
      change: number;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsSnapshotSchema: Schema = new Schema(
  {
    snapshotDate: { type: Date, required: true },
    type: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    metrics: {
      totalCustomers: { type: Number, default: 0 },
      newCustomers: { type: Number, default: 0 },
      activeCustomers: { type: Number, default: 0 },
      returningCustomers: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      orderCount: { type: Number, default: 0 },
      avgOrderValue: { type: Number, default: 0 },
      rentalRevenue: { type: Number, default: 0 },
      purchaseRevenue: { type: Number, default: 0 },
      customOrderRevenue: { type: Number, default: 0 },
      cartAbandonmentRate: { type: Number, default: 0 },
      checkoutCompletionRate: { type: Number, default: 0 },

      topSearches: [{ query: String, count: Number, intent: String }],
      zeroResultSearches: [{ query: String, count: Number }],
      searchSuccessRate: { type: Number, default: 0 },
      searchToClickRate: { type: Number, default: 0 },
      searchToPurchaseRate: { type: Number, default: 0 },

      topProducts: [
        {
          productId: Schema.Types.Mixed,
          views: Number,
          clicks: Number,
          purchases: Number,
          revenue: Number,
          conversionRate: Number,
        },
      ],
      productAffinities: [
        {
          productA: Schema.Types.Mixed,
          productB: Schema.Types.Mixed,
          cooccurrenceCount: Number,
          confidence: Number,
        },
      ],

      customerSegments: {
        highValue: { type: Number, default: 0 },
        returning: { type: Number, default: 0 },
        new: { type: Number, default: 0 },
        inactive: { type: Number, default: 0 },
        cartAbandoners: { type: Number, default: 0 },
        frequentBuyers: { type: Number, default: 0 },
        rentalFocused: { type: Number, default: 0 },
        couponHeavy: { type: Number, default: 0 },
        premium: { type: Number, default: 0 },
        vip: { type: Number, default: 0 },
        atRisk: { type: Number, default: 0 },
        churnRisk: { type: Number, default: 0 },
        referralChampions: { type: Number, default: 0 },
      },

      funnelMetrics: {
        homepage: { type: Number, default: 0 },
        category: { type: Number, default: 0 },
        product: { type: Number, default: 0 },
        cart: { type: Number, default: 0 },
        checkout: { type: Number, default: 0 },
        payment: { type: Number, default: 0 },
        orderSuccess: { type: Number, default: 0 },
        dropoffs: {
          homepageToCategory: { type: Number, default: 0 },
          categoryToProduct: { type: Number, default: 0 },
          productToCart: { type: Number, default: 0 },
          cartToCheckout: { type: Number, default: 0 },
          checkoutToPayment: { type: Number, default: 0 },
          paymentToSuccess: { type: Number, default: 0 },
        },
        avgCompletionTimeMs: { type: Number, default: 0 },
      },

      trafficSources: [{ channel: String, visitors: Number, conversions: Number, revenue: Number }],

      cohortRetention: [{ type: Schema.Types.Mixed }],

      recommendationMetrics: {
        shown: { type: Number, default: 0 },
        clicked: { type: Number, default: 0 },
        carted: { type: Number, default: 0 },
        purchased: { type: Number, default: 0 },
        clickRate: { type: Number, default: 0 },
        cartRate: { type: Number, default: 0 },
        purchaseRate: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 },
      },

      aiInsights: [
        { category: String, message: String, severity: String, metric: String, change: Number },
      ],
    },
  },
  { timestamps: true },
);

AnalyticsSnapshotSchema.index({ snapshotDate: 1, type: 1 }, { unique: true });

const AnalyticsSnapshot = mongoose.model<IAnalyticsSnapshot>(
  'AnalyticsSnapshot',
  AnalyticsSnapshotSchema,
);
export default AnalyticsSnapshot;
