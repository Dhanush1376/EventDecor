import crypto from 'crypto';
import mongoose from 'mongoose';
import MarketingAutomation, { IMarketingAutomation } from '../../models/MarketingAutomation';
import AutomationEnrollment from '../../models/AutomationEnrollment';
import User from '../../models/User';
import Order from '../../models/Order';
import NotificationLog from '../../models/NotificationLog';
import ConsentPreference from '../../models/ConsentPreference';
import EmailBlockRenderer from './EmailBlockRenderer';
import { EmailProviderAbstraction } from './EmailProviderAbstraction';
import logger from '../../config/logger';

export class AutomationEngineService {
  /**
   * Scans for customers who abandoned their shopping carts and enrolls them into the workflow
   */
  static async scanAndEnrollAbandonedCarts(): Promise<number> {
    try {
      const automation = await MarketingAutomation.findOne({
        triggerType: 'abandoned_cart',
        status: 'active',
      });

      if (!automation || !automation.steps || automation.steps.length === 0) {
        return 0;
      }

      // Look for users with items in cart updated at least 1 hour ago
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const eligibleUsers = await User.find({
        role: { $in: ['customer', 'user'] },
        'cart.0': { $exists: true }, // Cart is non-empty
        updatedAt: { $lte: oneHourAgo, $gte: sevenDaysAgo },
        'notificationPreferences.categories.promotions': { $ne: false },
      })
        .populate('cart.product')
        .select('_id name email cart updatedAt')
        .lean();

      let newlyEnrolled = 0;

      for (const user of eligibleUsers) {
        const email = user.email?.toLowerCase();
        if (!email) continue;

        // Check if user is unsubscribed
        const isSuppressed = await ConsentPreference.findOne({
          consentToken: email,
          marketingEmails: false,
        });
        if (isSuppressed) continue;

        // Check if customer already placed an order after cart was last updated
        const recentOrder = await Order.findOne({
          user: user._id,
          orderStatus: { $nin: ['Cancelled'] },
          createdAt: { $gte: user.updatedAt },
        });
        if (recentOrder) continue;

        // Check if there is already an active or recent enrollment within 7 days
        const existingEnrollment = await AutomationEnrollment.findOne({
          automationId: automation._id,
          userId: user._id,
          createdAt: { $gte: sevenDaysAgo },
        });
        if (existingEnrollment) continue;

        // Calculate step 1 delay
        const step1 = automation.steps[0];
        const delayMs = (step1.delayHours || 1) * 60 * 60 * 1000;
        const nextExecutionAt = new Date(Date.now() + delayMs);

        // Snapshot cart for safe history
        const cartItemsSnapshot = (user.cart || []).map((c: any) => ({
          title: c.product?.title || 'Selected Art Piece',
          imageSrc: c.product?.imageSrc || '',
          price: c.product?.price || 0,
          quantity: c.quantity || 1,
          variant: c.variant || 'Default',
        }));
        const cartTotal = cartItemsSnapshot.reduce(
          (sum: number, it: any) => sum + it.price * it.quantity,
          0,
        );

        await AutomationEnrollment.create({
          automationId: automation._id,
          userId: user._id,
          customerEmail: email,
          triggerType: 'abandoned_cart',
          currentStepIndex: 0,
          nextExecutionAt,
          status: 'active',
          contextData: {
            cartSnapshot: cartItemsSnapshot,
            cartTotal,
            cartUpdatedAt: user.updatedAt,
          },
        });

        await MarketingAutomation.findByIdAndUpdate(automation._id, {
          $inc: { 'stats.triggeredCount': 1 },
        });

        newlyEnrolled++;
      }

      if (newlyEnrolled > 0) {
        logger.info(
          `[AutomationEngine] Enrolled ${newlyEnrolled} users into Abandoned Cart workflow`,
        );
      }
      return newlyEnrolled;
    } catch (err: any) {
      logger.error(`[AutomationEngine.scanAndEnrollAbandonedCarts] Error: ${err.message}`);
      return 0;
    }
  }

  /**
   * Executes due steps for all active automation enrollments
   */
  static async processDueEnrollments(): Promise<{
    processed: number;
    sent: number;
    cancelled: number;
  }> {
    const now = new Date();
    let processed = 0;
    let sent = 0;
    let cancelled = 0;

    try {
      const dueEnrollments = await AutomationEnrollment.find({
        status: 'active',
        nextExecutionAt: { $lte: now },
      })
        .populate('automationId')
        .limit(50);

      for (const enrollment of dueEnrollments) {
        processed++;
        const automation = enrollment.automationId as unknown as IMarketingAutomation;

        if (!automation || automation.status !== 'active') {
          continue;
        }

        const currentStep = automation.steps[enrollment.currentStepIndex];
        if (!currentStep) {
          enrollment.status = 'completed';
          await enrollment.save();
          continue;
        }

        // ==========================================
        // SAFETY VERIFICATION GATES (CRITICAL)
        // ==========================================
        const user = await User.findById(enrollment.userId).populate('cart.product');

        // 1. Check user exists & consent
        if (!user || user.notificationPreferences?.categories?.promotions === false) {
          enrollment.status = 'cancelled';
          enrollment.cancelReason = 'unsubscribed';
          await enrollment.save();
          cancelled++;
          continue;
        }

        const isSuppressed = await ConsentPreference.findOne({
          consentToken: user.email.toLowerCase(),
          marketingEmails: false,
        });
        if (isSuppressed) {
          enrollment.status = 'cancelled';
          enrollment.cancelReason = 'unsubscribed';
          await enrollment.save();
          cancelled++;
          continue;
        }

        // 2. Abandoned cart specific safety gates
        if (automation.triggerType === 'abandoned_cart') {
          // Check if cart is now empty
          if (!user.cart || user.cart.length === 0) {
            enrollment.status = 'cancelled';
            enrollment.cancelReason = 'cart_cleared';
            await enrollment.save();
            cancelled++;
            continue;
          }

          // Check if customer placed an order since enrollment
          const placedOrder = await Order.findOne({
            user: user._id,
            orderStatus: { $nin: ['Cancelled'] },
            createdAt: { $gte: enrollment.createdAt },
          });
          if (placedOrder) {
            enrollment.status = 'cancelled';
            enrollment.cancelReason = 'purchased';
            await enrollment.save();
            cancelled++;
            continue;
          }
        }

        // 3. Render and dispatch email step
        const trackingToken = crypto.randomBytes(24).toString('hex');
        const cartItems = (user.cart || []).map((c: any) => ({
          title: c.product?.title || 'Selected Art Piece',
          imageSrc: c.product?.imageSrc || '',
          price: c.product?.price || 0,
          quantity: c.quantity || 1,
          variant: c.variant || 'Default',
        }));
        const cartTotal = cartItems.reduce(
          (sum: number, it: any) => sum + it.price * it.quantity,
          0,
        );

        const renderedHtml = await EmailBlockRenderer.renderFullEmail(
          currentStep.designBlocks && currentStep.designBlocks.length > 0
            ? currentStep.designBlocks
            : [
                {
                  id: 'auto-header',
                  type: 'header',
                  content: {},
                },
                {
                  id: 'auto-cart',
                  type: 'cartSummary',
                  content: {},
                },
                {
                  id: 'auto-footer',
                  type: 'footer',
                  content: {},
                },
              ],
          {
            customer: {
              name: user.name || 'Valued Customer',
              firstName: (user.name || 'Valued Customer').split(' ')[0],
              email: user.email,
              loyaltyTier: user.loyaltyTier,
            },
            cart: {
              items: cartItems,
              total: cartTotal,
              url: '/cart',
            },
            campaign: {
              id: automation._id.toString(),
              title: automation.name,
              discountCode: currentStep.discountCode,
            },
            trackingToken,
          },
          currentStep.customHtml,
        );

        // Deliver via provider abstraction
        const dispatchResult = await EmailProviderAbstraction.send({
          to: user.email,
          subject: currentStep.subject,
          html: renderedHtml,
        });

        // Record NotificationLog
        const log = await NotificationLog.create({
          userId: user._id,
          recipientEmail: user.email.toLowerCase(),
          automationId: automation._id,
          stepNumber: currentStep.stepNumber,
          type: 'marketing',
          channel: 'email',
          action: `automation_${automation.triggerType}_step_${currentStep.stepNumber}`,
          status: dispatchResult.success ? 'delivered' : 'failed',
          errorDetails: dispatchResult.error,
          trackingToken,
          sendTime: new Date(),
        });

        enrollment.stepExecutions.push({
          stepNumber: currentStep.stepNumber,
          executedAt: new Date(),
          notificationLogId: log._id,
          status: dispatchResult.success ? 'sent' : 'failed',
        });

        if (dispatchResult.success) {
          sent++;
          await MarketingAutomation.findByIdAndUpdate(automation._id, {
            $inc: { 'stats.sentCount': 1 },
          });
        }

        // Progress to next step or complete
        const nextStepIndex = enrollment.currentStepIndex + 1;
        if (nextStepIndex < automation.steps.length) {
          const nextStep = automation.steps[nextStepIndex];
          const nextDelayMs = (nextStep.delayHours || 24) * 60 * 60 * 1000;
          enrollment.currentStepIndex = nextStepIndex;
          enrollment.nextExecutionAt = new Date(Date.now() + nextDelayMs);
        } else {
          enrollment.status = 'completed';
        }
        await enrollment.save();
      }

      return { processed, sent, cancelled };
    } catch (err: any) {
      logger.error(`[AutomationEngine.processDueEnrollments] Error: ${err.message}`);
      return { processed, sent, cancelled };
    }
  }

  /**
   * Immediately halts and cancels all active enrollments for a user (Called upon Order Placement or Unsubscribe)
   */
  static async cancelUserEnrollments(
    userId: string | mongoose.Types.ObjectId,
    reason: 'purchased' | 'cart_cleared' | 'unsubscribed' | 'manual',
  ): Promise<number> {
    try {
      const result = await AutomationEnrollment.updateMany(
        {
          userId: new mongoose.Types.ObjectId(userId.toString()),
          status: 'active',
        },
        {
          $set: {
            status: 'cancelled',
            cancelReason: reason,
          },
        },
      );
      if (result.modifiedCount > 0) {
        logger.info(
          `[AutomationEngine] Cancelled ${result.modifiedCount} active enrollments for user ${userId} (${reason})`,
        );
      }
      return result.modifiedCount;
    } catch (err: any) {
      logger.error(`[AutomationEngine.cancelUserEnrollments] Error: ${err.message}`);
      return 0;
    }
  }

  /**
   * Attributes order conversion to marketing campaign or automation
   * Attribution model: Click within 7 days -> Conversion attributed to campaign
   */
  static async attributeOrderConversion(order: any): Promise<boolean> {
    try {
      if (!order || !order.user) return false;

      const attributionWindowDays = 7;
      const windowStart = new Date(Date.now() - attributionWindowDays * 24 * 60 * 60 * 1000);

      // Find if user clicked any marketing notification log within attribution window
      const recentClickLog = await NotificationLog.findOne({
        userId: order.user,
        type: 'marketing',
        'clicks.0': { $exists: true },
        'clicks.clickedAt': { $gte: windowStart },
      }).sort({ 'clicks.clickedAt': -1 });

      if (!recentClickLog) return false;

      const orderTotal = Number(order.total || 0);

      // Update the log with attribution details
      recentClickLog.conversionOrderId = order._id;
      recentClickLog.revenueAttributed = orderTotal;
      await recentClickLog.save();

      // If associated with a Campaign
      if (recentClickLog.campaignId) {
        const EmailCampaign = mongoose.model('EmailCampaign');
        await EmailCampaign.findByIdAndUpdate(recentClickLog.campaignId, {
          $inc: {
            'stats.ordersCount': 1,
            'stats.revenueGenerated': orderTotal,
          },
        });
      }

      // If associated with an Automation
      if (recentClickLog.automationId) {
        await MarketingAutomation.findByIdAndUpdate(recentClickLog.automationId, {
          $inc: {
            'stats.convertedCount': 1,
            'stats.revenueRecovered': orderTotal,
          },
        });
      }

      logger.info(
        `[CONVERSION ATTRIBUTION] Order ${order._id} (₹${orderTotal}) attributed to ${
          recentClickLog.campaignId
            ? `Campaign ${recentClickLog.campaignId}`
            : `Automation ${recentClickLog.automationId}`
        }`,
      );

      return true;
    } catch (err: any) {
      logger.error(`[AutomationEngine.attributeOrderConversion] Error: ${err.message}`);
      return false;
    }
  }

  /**
   * Seeds default system automations (Abandoned Cart, Welcome Sequence) if not already created
   */
  static async initializeDefaultAutomations(): Promise<void> {
    try {
      const existingCartAuto = await MarketingAutomation.findOne({ triggerType: 'abandoned_cart' });
      if (!existingCartAuto) {
        await MarketingAutomation.create({
          name: 'Abandoned Cart Recovery Series',
          description:
            'Multi-step recovery sequence for customers who leave items in their cart without checking out.',
          triggerType: 'abandoned_cart',
          status: 'active',
          steps: [
            {
              stepNumber: 1,
              delayHours: 1,
              subject: 'You left something special behind',
              previewText: 'Your handpicked art treasures are waiting in your cart.',
              discountCode: '',
              designBlocks: [
                { id: 'b-hdr', type: 'header', content: {} },
                {
                  id: 'b-txt',
                  type: 'text',
                  content: {
                    text: 'Hi {{customer.firstName | default: "there"}},<br><br>We noticed you left beautiful artisanal decor in your shopping cart. We have saved your selection so you can pick up right where you left off!',
                  },
                },
                { id: 'b-cart', type: 'cartSummary', content: {} },
                { id: 'b-ftr', type: 'footer', content: {} },
              ],
            },
            {
              stepNumber: 2,
              delayHours: 24,
              subject: 'Still thinking about it? Here is a special surprise',
              previewText: 'Complete your decor purchase with an exclusive limited-time coupon.',
              discountCode: 'RECOVER10',
              designBlocks: [
                { id: 'b2-hdr', type: 'header', content: {} },
                {
                  id: 'b2-txt',
                  type: 'text',
                  content: {
                    text: 'Hi {{customer.firstName | default: "there"}},<br><br>Your handpicked items are still reserved for you! Take 10% off your entire order when you finish checking out today.',
                  },
                },
                {
                  id: 'b2-cpn',
                  type: 'coupon',
                  content: {
                    code: 'RECOVER10',
                    discountText: '10% OFF YOUR RESERVED CART',
                    expiryText: 'Valid for the next 24 hours only',
                  },
                },
                { id: 'b2-cart', type: 'cartSummary', content: {} },
                { id: 'b2-ftr', type: 'footer', content: {} },
              ],
            },
          ],
          stopConditions: {
            onOrderPlaced: true,
            onCartCleared: true,
            onUnsubscribed: true,
          },
          frequencyGuard: {
            enabled: true,
            maxPerWeek: 3,
          },
          stats: {
            triggeredCount: 0,
            sentCount: 0,
            convertedCount: 0,
            revenueRecovered: 0,
          },
        });
        logger.info('[AutomationEngine] Seeded default Abandoned Cart Recovery Series');
      }
    } catch (err: any) {
      logger.error(`[AutomationEngine.initializeDefaultAutomations] Error: ${err.message}`);
    }
  }
}

export default AutomationEngineService;
