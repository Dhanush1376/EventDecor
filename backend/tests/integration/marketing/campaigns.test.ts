import '../setup';
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import User from '../../../src/models/User';
import Order from '../../../src/models/Order';
import ConsentPreference from '../../../src/models/ConsentPreference';
import EmailCampaign from '../../../src/models/EmailCampaign';
import NotificationLog from '../../../src/models/NotificationLog';
import MarketingAutomation from '../../../src/models/MarketingAutomation';
import AutomationEnrollment from '../../../src/models/AutomationEnrollment';
import AudienceResolverService from '../../../src/services/marketing/AudienceResolverService';
import CampaignExecutionService from '../../../src/services/marketing/CampaignExecutionService';
import EmailBlockRenderer from '../../../src/services/marketing/EmailBlockRenderer';
import AutomationEngineService from '../../../src/services/marketing/AutomationEngineService';

describe('Marketing Campaigns & Lifecycle Automation System', () => {
  let testUser1: any;
  let testUser2: any;
  let unsubscribedUser: any;

  beforeEach(async () => {
    // 1. Create Test Customers
    testUser1 = await User.create({
      name: 'Ravi Verma',
      email: 'ravi.verma@example.com',
      role: 'customer',
      loyaltyTier: 'Gold',
      notificationPreferences: {
        categories: { promotions: true },
      },
      cart: [
        {
          quantity: 2,
          variant: 'Standard',
        },
      ],
    });

    testUser2 = await User.create({
      name: 'Ananya Rao',
      email: 'ananya.rao@example.com',
      role: 'customer',
      loyaltyTier: 'Silver',
      notificationPreferences: {
        categories: { promotions: true },
      },
      cart: [],
    });

    unsubscribedUser = await User.create({
      name: 'Pooja Hegde',
      email: 'pooja.unsub@example.com',
      role: 'customer',
      loyaltyTier: 'Bronze',
      notificationPreferences: {
        categories: { promotions: false }, // Opted out
      },
      cart: [],
    });

    // Add orders for testUser1 so totalSpent > 5000 and ordersCount = 2
    await Order.create([
      {
        user: testUser1._id,
        items: [
          {
            title: 'Brass Diya',
            price: 3000,
            quantity: 1,
            imageSrc: 'https://example.com/diya.jpg',
          },
        ],
        shippingAddress: {
          name: 'Ravi Verma',
          phone: '9876543210',
          email: 'ravi.verma@example.com',
          pincode: '500001',
          locality: 'Banjara Hills',
          address: 'Road No 12',
          city: 'Hyderabad',
          state: 'Telangana',
          country: 'India',
        },
        subtotal: 3000,
        total: 3000,
        orderStatus: 'Delivered',
      },
      {
        user: testUser1._id,
        items: [
          {
            title: 'Lotus Urli',
            price: 3500,
            quantity: 1,
            imageSrc: 'https://example.com/urli.jpg',
          },
        ],
        shippingAddress: {
          name: 'Ravi Verma',
          phone: '9876543210',
          email: 'ravi.verma@example.com',
          pincode: '500001',
          locality: 'Banjara Hills',
          address: 'Road No 12',
          city: 'Hyderabad',
          state: 'Telangana',
          country: 'India',
        },
        subtotal: 3500,
        total: 3500,
        orderStatus: 'Delivered',
      },
    ]);
  });

  describe('Audience Resolver Engine', () => {
    it('correctly calculates audience by lifetime spend rule', async () => {
      const criteria = {
        filterRules: [{ field: 'totalSpent', operator: 'greater_than' as const, value: 5000 }],
        combinator: 'AND' as const,
      };

      const result = await AudienceResolverService.countAudience(criteria);
      expect(result.eligibleRecipients).toBe(1); // Only testUser1 has spent 6500

      const recipients = await AudienceResolverService.resolveRecipients(criteria);
      expect(recipients).toHaveLength(1);
      expect(recipients[0].email).toBe('ravi.verma@example.com');
      expect(recipients[0].firstName).toBe('Ravi');
      expect(recipients[0].totalSpent).toBe(6500);
      expect(recipients[0].ordersCount).toBe(2);
    });

    it('excludes unsubscribed users from marketing audience', async () => {
      const criteria = {
        type: 'all' as const,
        consentedOnly: true,
      };

      const recipients = await AudienceResolverService.resolveRecipients(criteria);
      const emails = recipients.map((r) => r.email);
      expect(emails).toContain('ravi.verma@example.com');
      expect(emails).toContain('ananya.rao@example.com');
      expect(emails).not.toContain('pooja.unsub@example.com');
    });

    it('identifies active cart holders correctly', async () => {
      const criteria = {
        filterRules: [{ field: 'hasActiveCart', operator: 'is_true' as const, value: true }],
      };

      const recipients = await AudienceResolverService.resolveRecipients(criteria);
      expect(recipients).toHaveLength(1);
      expect(recipients[0].email).toBe('ravi.verma@example.com');
    });
  });

  describe('Campaign Execution & Duplication', () => {
    it('validates campaign requirements before send', async () => {
      const emptyCampaign = new EmailCampaign({
        title: '',
        subject: '',
        designBlocks: [],
      });

      const validation = await CampaignExecutionService.validateCampaign(emptyCampaign);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('duplicates campaign with new ID and fresh zeroed metrics', async () => {
      const original = await EmailCampaign.create({
        title: 'Diwali Special',
        subject: 'Festival of Lights 2026',
        category: 'seasonal',
        status: 'sent',
        stats: {
          recipientCount: 500,
          sentCount: 500,
          deliveredCount: 490,
          openCount: 200,
          clickCount: 80,
          ordersCount: 15,
          revenueGenerated: 45000,
        },
      });

      const copy = await CampaignExecutionService.duplicateCampaign(original._id.toString());
      expect(copy._id.toString()).not.toBe(original._id.toString());
      expect(copy.title).toBe('Diwali Special (Copy)');
      expect(copy.status).toBe('draft');
      expect(copy.stats.sentCount).toBe(0);
      expect(copy.stats.revenueGenerated).toBe(0);
    });

    it('pauses and resumes a campaign cleanly', async () => {
      const campaign = await EmailCampaign.create({
        title: 'Weekend Flash Sale',
        subject: '24 Hours Only',
        status: 'draft',
      });

      const paused = await CampaignExecutionService.pauseCampaign(campaign._id.toString());
      expect(paused.status).toBe('paused');
      expect(paused.pausedAt).toBeDefined();

      const resumed = await CampaignExecutionService.resumeCampaign(campaign._id.toString());
      expect(resumed.status).toBe('draft');
    });
  });

  describe('Email Block Renderer & Dynamic Personalization', () => {
    it('interpolates personalization tokens with safe default fallback', () => {
      const template =
        'Hi {{customer.firstName | default: "there"}}, your cart total is ₹{{cart.total | default: "0"}}.';
      const rendered = EmailBlockRenderer.interpolateVariables(template, {
        customer: { firstName: 'Ravi' },
        cart: { total: 2500 },
      });
      expect(rendered).toBe('Hi Ravi, your cart total is ₹2500.');

      const withFallback = EmailBlockRenderer.interpolateVariables(template, {
        customer: {},
      });
      expect(withFallback).toBe('Hi there, your cart total is ₹0.');
    });

    it('wraps links with UTM tracking parameters and redirect gateway', () => {
      const rawUrl = 'https://siriarts.in/products/brass-diya';
      const wrapped = EmailBlockRenderer.wrapUrl(
        rawUrl,
        {
          campaign: { id: 'camp123' },
          trackingToken: 'token456',
          previewMode: false,
        },
        'btn-1',
      );

      expect(wrapped).toContain('/api/v1/notifications/track/click/token456');
      expect(wrapped).toContain('utm_campaign%3Dcamp123');
    });

    it('renders full email with CAN-SPAM compliant unsubscribe mechanism', async () => {
      const fullHtml = await EmailBlockRenderer.renderFullEmail(
        [
          {
            id: 'b-hdr',
            type: 'header',
            content: { storeName: 'Siri Arts' },
          },
          {
            id: 'b-txt',
            type: 'text',
            content: { text: '<p>Welcome to our family!</p>' },
          },
        ],
        {
          customer: { email: 'ravi.verma@example.com' },
          previewMode: true,
        },
      );

      expect(fullHtml).toContain('Unsubscribe from marketing emails');
      expect(fullHtml).toContain('ravi.verma%40example.com');
    });
  });

  describe('Lifecycle Automation & Immediate Safety Cancellation', () => {
    it('halts and cancels active enrollments when customer purchases', async () => {
      const auto = await MarketingAutomation.create({
        name: 'Abandoned Cart Series',
        triggerType: 'abandoned_cart',
        status: 'active',
        steps: [
          { stepNumber: 1, delayHours: 1, subject: 'You left something' },
          { stepNumber: 2, delayHours: 24, subject: 'Still waiting' },
        ],
      });

      const enrollment = await AutomationEnrollment.create({
        automationId: auto._id,
        userId: testUser1._id,
        customerEmail: testUser1.email,
        triggerType: 'abandoned_cart',
        currentStepIndex: 0,
        nextExecutionAt: new Date(Date.now() + 3600000),
        status: 'active',
      });

      expect(enrollment.status).toBe('active');

      // Simulate customer completing a purchase
      const cancelledCount = await AutomationEngineService.cancelUserEnrollments(
        testUser1._id,
        'purchased',
      );

      expect(cancelledCount).toBe(1);

      const updatedEnrollment = await AutomationEnrollment.findById(enrollment._id);
      expect(updatedEnrollment?.status).toBe('cancelled');
      expect(updatedEnrollment?.cancelReason).toBe('purchased');
    });

    it('attributes order revenue to campaign when customer clicks marketing email within window', async () => {
      const campaign = await EmailCampaign.create({
        title: 'Grand Heritage Launch',
        subject: 'Special 20% Off',
        status: 'sent',
        stats: { ordersCount: 0, revenueGenerated: 0 },
      });

      // Record a click on a marketing notification 2 hours ago
      const log = await NotificationLog.create({
        userId: testUser1._id,
        recipientEmail: testUser1.email,
        campaignId: campaign._id,
        type: 'marketing',
        action: 'campaign_broadcast',
        status: 'delivered',
        trackingToken: 'unique-token-test-123',
        clicks: [
          {
            url: 'https://siriarts.in/products',
            clickedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
        ],
      });

      // Now customer places an order for ₹4,200
      const order = await Order.create({
        user: testUser1._id,
        items: [
          {
            title: 'Royal Peacock Diya',
            price: 4200,
            quantity: 1,
            imageSrc: 'https://example.com/peacock.jpg',
          },
        ],
        shippingAddress: {
          name: 'Ravi Verma',
          phone: '9876543210',
          email: 'ravi.verma@example.com',
          pincode: '500001',
          locality: 'Banjara Hills',
          address: 'Road No 12',
          city: 'Hyderabad',
          state: 'Telangana',
          country: 'India',
        },
        subtotal: 4200,
        total: 4200,
        orderStatus: 'Confirmed',
      });

      const attributed = await AutomationEngineService.attributeOrderConversion(order);
      expect(attributed).toBe(true);

      // Verify NotificationLog received attribution
      const updatedLog = await NotificationLog.findById(log._id);
      expect(updatedLog?.revenueAttributed).toBe(4200);
      expect(updatedLog?.conversionOrderId?.toString()).toBe(order._id.toString());

      // Verify Campaign stats were updated
      const updatedCampaign = await EmailCampaign.findById(campaign._id);
      expect(updatedCampaign?.stats.ordersCount).toBe(1);
      expect(updatedCampaign?.stats.revenueGenerated).toBe(4200);
    });
  });
});
