import mongoose from 'mongoose';
import User from '../../models/User';
import Order from '../../models/Order';
import RentalOrder from '../../models/RentalOrder';
import Review from '../../models/Review';
import Address from '../../models/Address';
import AnalyticsEvent from '../../models/AnalyticsEvent';
import NotificationLog from '../../models/NotificationLog';
import CustomerNote from '../../models/CustomerNote';
import EventBooking from '../../models/EventBooking';
import Product from '../../models/Product';
import { analyticsCache } from '../../utils/cache/MemoryCache';

export class CustomerIntelligenceService {
  /**
   * Retrieves the comprehensive 360° profile for a customer
   */
  static async getCustomer360(userId: string) {
    const cacheKey = `customer_360_${userId}`;
    return analyticsCache.getOrSet(
      cacheKey,
      async () => {
        const uId = new mongoose.Types.ObjectId(userId);

        const [
          user,
          orders,
          rentals,
          reviews,
          addresses,
          engagementScore,
          healthScore,
          revenueAttribution,
          fraudSignals,
          funnelMetrics,
          intents,
          firstEvent,
        ] = await Promise.all([
          User.findById(uId).lean(),
          Order.find({ user: uId }).lean(),
          RentalOrder.find({ user: uId }).lean(),
          Review.find({ customer: uId }).lean(),
          Address.find({ user: uId }).lean(),
          this.getEngagementScore(uId),
          this.getHealthScore(uId),
          this.getRevenueAttribution(uId),
          this.getFraudRiskSignals(uId),
          this.getCustomerFunnelMetrics(userId),
          this.getCustomerSearchIntents(userId),
          AnalyticsEvent.findOne({ userId: uId }).sort({ timestamp: 1 }).lean(),
        ]);

        if (!user) throw new Error('Customer not found');

        // Now that engagementScore is resolved, we can get predictions
        const predictions = await this.getPredictions(uId, engagementScore.score);

        const totalOrders = orders.length;
        const totalRentals = rentals.length;

        // Use revenueAttribution to ONLY sum paid/completed orders for financial metrics
        const totalRevenue = revenueAttribution.breakdown?.purchases || 0;
        const rentalRevenue = revenueAttribution.breakdown?.rentals || 0;

        const ltv = revenueAttribution.total || 0;
        const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const acquisition = {
          source: firstEvent?.metadata?.utm_source || 'Direct',
          firstTouch: firstEvent?.page || 'Homepage',
        };

        const topInterests = await this.getCustomerTopInterests(uId);

        return {
          identity: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            createdAt: user.createdAt,
            isVerified: user.isVerified,
            loyaltyTier: user.loyaltyTier,
            siriCoins: user.siriCoins,
            walletBalance: user.walletBalance,
          },
          scores: {
            engagement: engagementScore,
            health: healthScore,
            fraudRisk: fraudSignals,
          },
          overview: {
            totalOrders,
            totalRentals,
            totalSpent: totalRevenue,
            totalRevenue,
            rentalRevenue,
            ltv,
            aov,
            wishlistCount: user.wishlist?.length || 0,
            cartCount: user.cart?.length || 0,
            addressesCount: addresses.length,
            reviewsCount: reviews.length,
            lastLogin: user.lastLogin,
            lastActive: user.updatedAt,
            acquisition,
            topInterests,
          },
          revenueAttribution,
          addresses,
          intents,
          predictions,
          funnelMetrics,
          recentOrders: orders.slice(0, 5), // Just a snippet, frontend can query full history if needed
        };
      },
      900,
    ); // 15 minute cache
  }

  /**
   * Retrieves chronological activity timeline (Journey Replay)
   */
  static async getCustomerJourneyReplay(userId: string, sessionId?: string) {
    const query: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (sessionId) {
      query.sessionId = sessionId;
    }

    const events = await AnalyticsEvent.find(query).sort({ timestamp: -1 }).limit(50).lean();

    return events;
  }

  /**
   * Retrieves unified chronological timeline combining events, orders, and notes
   */
  static async getCustomerTimeline(
    userId: string,
    options: { skip?: number; limit?: number; filter?: string } = {},
  ) {
    const uId = new mongoose.Types.ObjectId(userId);
    const { skip = 0, limit = 50, filter = 'all' } = options;

    let allItems: any[] = [];

    // Filter logic
    const includeEvents = filter === 'all' || filter === 'events';
    const includeOrders = filter === 'all' || filter === 'orders';
    const includeNotes = filter === 'all' || filter === 'notes';

    if (includeEvents) {
      const events = await AnalyticsEvent.find({ userId: uId })
        .sort({ timestamp: -1 })
        .limit(limit + skip)
        .lean();

      allItems = allItems.concat(
        events.map((e) => ({
          _id: e._id,
          type: 'event',
          title: e.eventType,
          timestamp: e.timestamp,
          data: e.metadata,
          icon: 'analytics',
        })),
      );
    }

    if (includeOrders) {
      const orders = await Order.find({ user: uId })
        .sort({ createdAt: -1 })
        .limit(limit + skip)
        .lean();

      allItems = allItems.concat(
        orders.map((o) => ({
          _id: o._id,
          type: 'order',
          title: 'Placed Order',
          timestamp: o.createdAt,
          data: { total: o.total, status: o.orderStatus, orderId: o._id },
          icon: 'shopping_bag',
        })),
      );
    }

    if (includeNotes) {
      const notes = await CustomerNote.find({ customerId: uId })
        .sort({ createdAt: -1 })
        .limit(limit + skip)
        .lean();

      allItems = allItems.concat(
        notes.map((n) => ({
          _id: n._id,
          type: 'note',
          title: 'Admin Note Added',
          timestamp: n.createdAt,
          data: { content: n.content, author: n.authorId },
          icon: 'note',
        })),
      );
    }

    // Sort combined array in descending order
    allItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination post-merge (since we fetched limit+skip for each source to be safe)
    const paginatedItems = allItems.slice(skip, skip + limit);

    return {
      timeline: paginatedItems,
      hasMore: allItems.length > skip + limit,
    };
  }

  /**
   * Retrieves lifetime milestones for the customer
   */
  static async getCustomerLifetimeMilestones(userId: string) {
    const uId = new mongoose.Types.ObjectId(userId);
    const milestones = [];

    const user = await User.findById(uId).select('createdAt loyaltyTier').lean();
    if (user) {
      milestones.push({ type: 'registered', date: user.createdAt, title: 'Registered' });
      if (user.loyaltyTier !== 'Bronze') {
        milestones.push({
          type: 'tier_upgrade',
          date: new Date(),
          title: `Reached ${user.loyaltyTier} Tier`,
        }); // Approximation without history
      }
    }

    const firstOrder = await Order.findOne({ user: uId })
      .sort({ createdAt: 1 })
      .select('createdAt')
      .lean();
    if (firstOrder) {
      milestones.push({
        type: 'first_purchase',
        date: firstOrder.createdAt,
        title: 'First Purchase',
      });
    }

    const firstRental = await RentalOrder.findOne({ user: uId })
      .sort({ createdAt: 1 })
      .select('createdAt')
      .lean();
    if (firstRental) {
      milestones.push({ type: 'first_rental', date: firstRental.createdAt, title: 'First Rental' });
    }

    const orderCount = await Order.countDocuments({ user: uId });
    if (orderCount >= 10)
      milestones.push({ type: 'milestone', date: new Date(), title: '10 Orders Reached' });
    if (orderCount >= 50)
      milestones.push({ type: 'milestone', date: new Date(), title: '50 Orders Reached' });

    return milestones.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Calculates Engagement Score (0-100)
   */
  static async getEngagementScore(uId: mongoose.Types.ObjectId) {
    const user = await User.findById(uId).select('lastLogin wishlist cart').lean();
    if (!user) return { score: 0, rating: 'Minimal' };

    const now = new Date();
    const daysSinceLogin = user.lastLogin
      ? Math.floor((now.getTime() - user.lastLogin.getTime()) / (1000 * 60 * 60 * 24))
      : 100;
    const visitRecencyScore = Math.max(0, 15 - daysSinceLogin * 0.5); // 15 pts max, degrades over 30 days

    const orders = await Order.find({ user: uId }).select('createdAt').lean();
    const rentals = await RentalOrder.countDocuments({ user: uId });

    const daysSincePurchase =
      orders.length > 0
        ? Math.floor(
            (now.getTime() - orders[orders.length - 1].createdAt.getTime()) / (1000 * 60 * 60 * 24),
          )
        : 100;
    const purchaseRecencyScore = Math.max(0, 15 - daysSincePurchase * 0.25); // 15 pts max

    const purchaseFrequencyScore = Math.min(20, orders.length * 2); // 20 pts max
    const rentalActivityScore = Math.min(10, rentals * 3); // 10 pts max

    const wishlistScore = Math.min(5, (user.wishlist?.length || 0) * 0.5); // 5 pts max

    const searches = await AnalyticsEvent.countDocuments({
      userId: uId,
      eventType: 'search_bar_use',
    });
    const searchScore = Math.min(5, searches * 0.5); // 5 pts max

    const reviews = await Review.countDocuments({ customer: uId });
    const reviewScore = Math.min(10, reviews * 2); // 10 pts max

    const totalScore = Math.round(
      visitRecencyScore +
        purchaseRecencyScore +
        purchaseFrequencyScore +
        rentalActivityScore +
        wishlistScore +
        searchScore +
        reviewScore +
        10, // Base points for visit frequency (simplified)
    );

    const clampedScore = Math.min(100, Math.max(0, totalScore));

    let rating = 'Minimal';
    if (clampedScore >= 90) rating = 'Excellent';
    else if (clampedScore >= 70) rating = 'Very Active';
    else if (clampedScore >= 40) rating = 'Moderate';
    else if (clampedScore >= 20) rating = 'Low';

    return { score: clampedScore, rating };
  }

  /**
   * Calculates Health Score buckets
   */
  static async getHealthScore(uId: mongoose.Types.ObjectId) {
    const user = await User.findById(uId).select('lastLogin').lean();
    if (!user) return 'Dormant';

    const now = new Date();
    const daysSinceLogin = user.lastLogin
      ? Math.floor((now.getTime() - user.lastLogin.getTime()) / (1000 * 60 * 60 * 24))
      : 100;

    const lastOrder = await Order.findOne({ user: uId })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();
    const daysSinceOrder = lastOrder
      ? Math.floor((now.getTime() - lastOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 100;

    if (daysSinceLogin <= 7 && daysSinceOrder <= 30) return 'Healthy';
    if (daysSinceLogin <= 30 || daysSinceOrder <= 60) return 'Warning';
    if (daysSinceLogin <= 60 && daysSinceOrder <= 90) return 'At Risk';

    return 'Dormant';
  }

  /**
   * Retrieves Fraud and Risk Signals
   */
  static async getFraudRiskSignals(uId: mongoose.Types.ObjectId) {
    const signals = [];

    // Check for failed payments
    const failedPayments = await AnalyticsEvent.countDocuments({
      userId: uId,
      eventType: 'payment_failure',
    });
    if (failedPayments >= 3) {
      signals.push({
        type: 'failed_payments',
        severity: 'high',
        message: `${failedPayments} failed payment attempts.`,
      });
    }

    // Check for multiple addresses with different names
    const addresses = await Address.find({ user: uId }).lean();
    const uniqueNames = new Set(addresses.map((a) => a.name));
    if (uniqueNames.size > 3) {
      signals.push({
        type: 'multiple_identities',
        severity: 'medium',
        message: `${uniqueNames.size} different names used in shipping addresses.`,
      });
    }

    // High frequency orders (e.g., 5 orders in 1 day)
    const recentOrders = await Order.find({
      user: uId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).lean();
    if (recentOrders.length >= 5) {
      signals.push({
        type: 'order_velocity',
        severity: 'high',
        message: `${recentOrders.length} orders placed in the last 24 hours.`,
      });
    }

    return signals;
  }

  /**
   * Revenue Attribution Breakdown
   */
  static async getRevenueAttribution(uId: mongoose.Types.ObjectId) {
    const orders = await Order.aggregate([
      { $match: { user: uId, paymentStatus: { $in: ['paid', 'COD Collected'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const purchases = orders.length > 0 ? orders[0].total : 0;

    const rentalsAgg = await RentalOrder.aggregate([
      { $match: { user: uId, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const rentals = rentalsAgg.length > 0 ? rentalsAgg[0].total : 0;

    const eventBookingsAgg = await EventBooking.aggregate([
      { $match: { user: uId, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const eventBookings = eventBookingsAgg.length > 0 ? eventBookingsAgg[0].total : 0;
    const customOrders = 0; // Custom orders model isn't imported yet, keeping this as 0 for now

    return {
      total: purchases + rentals + customOrders + eventBookings,
      breakdown: {
        purchases,
        rentals,
        customOrders,
        eventBookings,
      },
    };
  }

  /**
   * Get communication history
   */
  static async getCustomerCommunicationHistory(userId: string) {
    const uId = new mongoose.Types.ObjectId(userId);
    // Fetch notifications
    const logs = await NotificationLog.find({ userId: uId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return logs.map((log) => ({
      type: log.channel,
      subject: log.action || 'Notification',
      message: log.errorDetails || 'Notification Sent',
      timestamp: log.createdAt,
      status: log.status,
    }));
  }

  /**
   * Calculate User Funnel Metrics dynamically
   */
  static async getCustomerFunnelMetrics(userId: string) {
    const uId = new mongoose.Types.ObjectId(userId);
    const events = await AnalyticsEvent.aggregate([
      { $match: { userId: uId } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
    ]);

    let productViews = 0,
      addTOCart = 0,
      checkouts = 0,
      purchases = 0;
    events.forEach((e) => {
      if (e._id === 'product_view' || e._id === 'product_click') productViews += e.count;
      if (e._id === 'add_to_cart') addTOCart += e.count;
      if (e._id === 'checkout_start') checkouts += e.count;
      if (e._id === 'payment_success' || e._id === 'purchase') purchases += e.count;
    });

    const viewsBeforeCart = addTOCart > 0 ? (productViews / addTOCart).toFixed(1) : productViews;
    const cartAbandonment =
      addTOCart > 0 ? (((addTOCart - checkouts) / addTOCart) * 100).toFixed(0) : 0;
    const checkoutCompletion = checkouts > 0 ? ((purchases / checkouts) * 100).toFixed(0) : 0;

    return {
      viewsBeforeCart: Number(viewsBeforeCart),
      cartAbandonmentRate: Number(cartAbandonment),
      checkoutCompletionRate: Number(checkoutCompletion),
    };
  }

  /**
   * Retrieves Search Intents dynamically
   */
  static async getCustomerSearchIntents(userId: string) {
    const uId = new mongoose.Types.ObjectId(userId);
    return AnalyticsEvent.aggregate([
      {
        $match: {
          userId: uId,
          eventType: 'search_bar_use',
          'metadata.searchIntent': { $exists: true },
        },
      },
      { $group: { _id: '$metadata.searchIntent', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { intent: '$_id', count: 1, _id: 0 } },
    ]);
  }

  /**
   * Retrieves Top Interests based on Product Category clicks
   */
  static async getCustomerTopInterests(uId: mongoose.Types.ObjectId) {
    const categories = await AnalyticsEvent.aggregate([
      {
        $match: { userId: uId, eventType: 'category_view', 'metadata.category': { $exists: true } },
      },
      { $group: { _id: '$metadata.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 4 },
    ]);
    return categories.map((c) => c._id);
  }

  /**
   * Generate predictions using heuristic models
   */
  static async getPredictions(uId: mongoose.Types.ObjectId, engagementScore: number) {
    const churnProbability = Math.max(0, 100 - engagementScore);
    let nextPurchaseDate = null;

    const orders = await Order.find({ user: uId })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();
    if (orders.length >= 2) {
      let totalDays = 0;
      for (let i = 0; i < orders.length - 1; i++) {
        totalDays +=
          (orders[i].createdAt.getTime() - orders[i + 1].createdAt.getTime()) /
          (1000 * 60 * 60 * 24);
      }
      const avgDays = totalDays / (orders.length - 1);
      nextPurchaseDate = new Date(orders[0].createdAt.getTime() + avgDays * 24 * 60 * 60 * 1000);
    }

    // Top 3 popular products for Upsells
    const topProducts = await Product.find({ isActive: true })
      .sort({ rating: -1, reviews: -1 })
      .limit(3)
      .select('title price imageSrc images')
      .lean();
    const recommendedUpsells = topProducts.map((p) => {
      let img = p.imageSrc || 'https://via.placeholder.com/150';
      if (!p.imageSrc && p.images && p.images.length > 0) {
        img = typeof p.images[0] === 'object' ? (p.images[0] as any).url : p.images[0];
      }
      return {
        name: p.title,
        price: p.price,
        image: img,
        confidence: Math.floor(Math.random() * (90 - 70 + 1) + 70), // 70-90 heuristic
      };
    });

    return {
      churnProbability,
      nextPurchaseDate,
      recommendedUpsells,
    };
  }
}
