import dotenv from 'dotenv';
import WhatsAppAutomation from '../models/WhatsAppAutomation';
import WhatsAppTemplate from '../models/WhatsAppTemplate';
import WhatsAppRecipient from '../models/WhatsAppRecipient';
import { connectDB } from '../config/db';
import logger from '../config/logger';

dotenv.config();

const automations = [
  { key: 'new_order', name: 'New Order', category: 'order', priority: 'high', enabled: true },
  { key: 'cod_order', name: 'COD Order', category: 'order', priority: 'high', enabled: true },
  { key: 'paid_order', name: 'Paid Order', category: 'payment', priority: 'normal', enabled: true },
  {
    key: 'payment_failed',
    name: 'Payment Failed',
    category: 'payment',
    priority: 'critical',
    enabled: true,
  },
  {
    key: 'order_cancelled',
    name: 'Order Cancelled',
    category: 'order',
    priority: 'high',
    enabled: true,
  },
  {
    key: 'order_confirmed',
    name: 'Order Confirmed',
    category: 'order',
    priority: 'normal',
    enabled: true,
  },
  {
    key: 'order_processing',
    name: 'Order Processing',
    category: 'order',
    priority: 'normal',
    enabled: true,
  },
  { key: 'delivered', name: 'Delivered', category: 'order', priority: 'normal', enabled: true },
  {
    key: 'return_requested',
    name: 'Return Requested',
    category: 'order',
    priority: 'high',
    enabled: true,
  },
  {
    key: 'refund_initiated',
    name: 'Refund Initiated',
    category: 'payment',
    priority: 'normal',
    enabled: true,
  },
  {
    key: 'refund_completed',
    name: 'Refund Completed',
    category: 'payment',
    priority: 'normal',
    enabled: true,
  },
  {
    key: 'event_booking_created',
    name: 'Event Booking Created',
    category: 'booking',
    priority: 'high',
    enabled: true,
  },
  {
    key: 'event_booking_updated',
    name: 'Event Booking Updated',
    category: 'booking',
    priority: 'normal',
    enabled: true,
  },
  {
    key: 'contact_form_submitted',
    name: 'Contact Form Submitted',
    category: 'engagement',
    priority: 'normal',
    enabled: true,
  },
  { key: 'new_review', name: 'New Review', category: 'engagement', priority: 'low', enabled: true },
  {
    key: 'low_inventory',
    name: 'Low Inventory',
    category: 'inventory',
    priority: 'high',
    enabled: true,
  },
  {
    key: 'product_out_of_stock',
    name: 'Product Out Of Stock',
    category: 'inventory',
    priority: 'critical',
    enabled: true,
  },
  {
    key: 'new_customer_registered',
    name: 'New Customer Registered',
    category: 'engagement',
    priority: 'low',
    enabled: false,
  },
  {
    key: 'high_value_order',
    name: 'High Value Order',
    category: 'order',
    priority: 'critical',
    enabled: true,
  },
  {
    key: 'vip_customer_order',
    name: 'VIP Customer Order',
    category: 'order',
    priority: 'high',
    enabled: true,
  },
  {
    key: 'daily_summary',
    name: 'Daily Summary',
    category: 'summary',
    priority: 'low',
    enabled: true,
  },
  {
    key: 'weekly_summary',
    name: 'Weekly Summary',
    category: 'summary',
    priority: 'low',
    enabled: true,
  },
  {
    key: 'monthly_summary',
    name: 'Monthly Summary',
    category: 'summary',
    priority: 'low',
    enabled: true,
  },
];

const seedWhatsAppAutomations = async () => {
  try {
    await connectDB();
    logger.info('Connected to DB for seeding WhatsApp Automations...');

    // 1. Create default recipients
    const owner = await WhatsAppRecipient.findOneAndUpdate(
      { role: 'owner' },
      { name: 'Store Owner', phone: '+919999999999', role: 'owner', isActive: true },
      { upsert: true, new: true },
    );
    const warehouse = await WhatsAppRecipient.findOneAndUpdate(
      { role: 'warehouse' },
      { name: 'Warehouse Team', phone: '+918888888888', role: 'warehouse', isActive: true },
      { upsert: true, new: true },
    );
    const accounts = await WhatsAppRecipient.findOneAndUpdate(
      { role: 'accounts' },
      { name: 'Accounts Team', phone: '+917777777777', role: 'accounts', isActive: true },
      { upsert: true, new: true },
    );

    const getDetailedTemplate = (key: string, name: string, category: string) => {
      switch (key) {
        case 'new_order':
        case 'cod_order':
          return `*NEW ORDER ALERT* 🚨\nA new order has just been placed!\n\n*Order Details:*\n🆔 ID: {{order_number}}\n💰 Total: {{grand_total}}\n\n*Customer Info:*\n👤 {{customer_name}}\n📞 {{customer_phone}}\n\n*Items Ordered:*\n{{products}}\n\nPlease check the dashboard to begin processing.`;

        case 'payment_failed':
          return `*PAYMENT FAILED* ⚠️\nA payment attempt failed during checkout.\n\n*Order Details:*\n🆔 ID: {{order_number}}\n💰 Amount Pending: {{grand_total}}\n\n*Customer Info:*\n👤 {{customer_name}}\n📞 {{customer_phone}}\n\nAction Required: Reach out to the customer to assist with payment recovery.`;

        case 'paid_order':
          return `*PAYMENT RECEIVED* 💸\nPayment successful for Order {{order_number}}!\n\n*Customer:* {{customer_name}}\n*Amount Collected:* {{grand_total}}\n\nThe order is now ready for fulfillment.`;

        case 'order_cancelled':
          return `*ORDER CANCELLED* ❌\nOrder {{order_number}} has been cancelled.\n\n*Customer:* {{customer_name}}\n*Value:* {{grand_total}}\n\nIf payment was already captured, please initiate a refund.`;

        case 'low_inventory':
        case 'product_out_of_stock':
          return `*INVENTORY ALERT* 📉\nItems are running dangerously low or are out of stock!\n\n*Affected Products:*\n{{products}}\n\nPlease restock immediately to prevent lost sales.`;

        case 'return_requested':
          return `*RETURN REQUESTED* 🔄\nA customer has requested a return.\n\n*Order:* {{order_number}}\n*Customer:* {{customer_name}}\n📞 {{customer_phone}}\n\nPlease review the request in the admin panel and schedule a pickup if approved.`;

        case 'high_value_order':
        case 'vip_customer_order':
          return `*⭐ HIGH PRIORITY ORDER ⭐*\nA VIP or High Value order has been received!\n\n*Order:* {{order_number}}\n*Total Value:* {{grand_total}}\n*Customer:* {{customer_name}} (📞 {{customer_phone}})\n\n*Items:*\n{{products}}\n\nPlease ensure white-glove fulfillment for this order.`;

        case 'daily_summary':
          return `*DAILY BUSINESS SUMMARY* 📊\nHere is your store performance for today:\n\n*Pending Orders:* {{order_number}}\n*Revenue Today:* {{grand_total}}\n\nCheck the operations center for detailed metrics.`;

        default:
          if (category === 'order' || category === 'payment') {
            return `*UPDATE: ${name.toUpperCase()}* 📦\nStatus update for Order {{order_number}}.\n\n*Customer:* {{customer_name}}\n*Total:* {{grand_total}}\n\n*Items:*\n{{products}}`;
          }
          return `*SYSTEM ALERT: ${name}* 🔔\n\nThis is an automated notification from EventDecor operations.\nReference: {{order_number}}\n\nPlease check the admin dashboard for details.`;
      }
    };

    // 2. Loop through and create automations
    for (const auto of automations) {
      // 2.1 Create default template for automation
      const template = await WhatsAppTemplate.findOneAndUpdate(
        { automationKey: auto.key, name: `Default ${auto.name}` },
        {
          automationKey: auto.key,
          name: `Default ${auto.name}`,
          targetAudience: 'all',
          layout: 'detailed',
          bodyTemplate: getDetailedTemplate(auto.key, auto.name, auto.category),
          isDefault: true,
          isActive: true,
        },
        { upsert: true, new: true },
      );

      // 2.2 Create automation config
      await WhatsAppAutomation.findOneAndUpdate(
        { automationKey: auto.key },
        {
          automationKey: auto.key,
          displayName: auto.name,
          description: `Automatically triggers when ${auto.name.toLowerCase()} occurs.`,
          category: auto.category as any,
          enabled: auto.enabled,
          priority: auto.priority as any,
          activeTemplateId: template._id,
          recipientRoles: [
            { recipientId: owner._id, enabled: true },
            { recipientId: warehouse._id, enabled: ['order', 'inventory'].includes(auto.category) },
            { recipientId: accounts._id, enabled: auto.category === 'payment' },
          ],
          sections: [
            { sectionKey: 'header', order: 1, enabled: true, showIcon: true, showDivider: true },
            { sectionKey: 'details', order: 2, enabled: true, showIcon: false, showDivider: true },
            { sectionKey: 'footer', order: 3, enabled: true, showIcon: false, showDivider: false },
          ],
          conditions: [],
        },
        { upsert: true },
      );
    }

    logger.info('WhatsApp Automations Seeded Successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding WhatsApp Automations:', error);
    process.exit(1);
  }
};

if (process.argv.includes('--run')) {
  seedWhatsAppAutomations();
}
export default seedWhatsAppAutomations;
