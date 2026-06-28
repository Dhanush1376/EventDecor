import mongoose from 'mongoose';
import '../config/loadEnv';

import Policy from '../models/Policy';

const policies = [
  {
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    status: 'published' as 'published',
    seoMetadata: {
      title: 'Privacy Policy - Siri Arts & Crafts',
      description: 'Learn how Siri Arts & Crafts collects, uses, and protects your personal data.',
    },
    content: `
      <h2>1. Introduction</h2>
      <p>Welcome to Siri Arts & Crafts. We respect your privacy and are committed to protecting your personal data.</p>
      <h2>2. The Data We Collect About You</h2>
      <p>We may collect identity data, contact data, transaction data, and event data.</p>
    `,
  },
  {
    title: 'Terms & Conditions',
    slug: 'terms-and-conditions',
    status: 'published' as 'published',
    seoMetadata: {
      title: 'Terms & Conditions - Siri Arts & Crafts',
      description:
        'Standard terms and conditions for using the Siri Arts & Crafts platform and services.',
    },
    content: `
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing and using Siri Arts & Crafts, you accept and agree to be bound by the terms and provision of this agreement.</p>
    `,
  },
  {
    title: 'Shipping & Delivery Policy',
    slug: 'shipping-policy',
    status: 'published' as 'published',
    seoMetadata: {
      title: 'Shipping & Delivery Policy - Siri Arts & Crafts',
      description:
        'Information regarding shipping methods, delivery timelines, and event setup logistics.',
    },
    content: `
      <h2>1. Order Processing Time</h2>
      <p>All standard retail orders are processed within 2-4 business days. Custom orders require a lead time of 7-14 business days.</p>
      <h2>2. Event Decoration Logistics</h2>
      <p>For event decoration services, our team will arrive at the venue at the pre-agreed time for setup.</p>
    `,
  },
  {
    title: 'Return Policy',
    slug: 'return-policy',
    status: 'published' as 'published',
    seoMetadata: {
      title: 'Return Policy - Siri Arts & Crafts',
      description: 'Our policy regarding returning standard retail products.',
    },
    content: `
      <h2>1. Standard Retail Products</h2>
      <p>We accept returns on standard, non-customized retail items within 7 days of delivery. To be eligible for a return, your item must be unused, in the same condition that you received it, and in the original packaging.</p>
      <h2>2. Non-Returnable Items</h2>
      <p>Custom and personalized orders (including custom mandala art and bespoke gifts) are strictly non-returnable.</p>
    `,
  },
  {
    title: 'Exchange Policy',
    slug: 'exchange-policy',
    status: 'published' as 'published',
    seoMetadata: {
      title: 'Exchange Policy - Siri Arts & Crafts',
      description: 'Information on how to exchange items purchased from our store.',
    },
    content: `
      <h2>1. Eligibility for Exchange</h2>
      <p>If you received a defective or damaged item, or if you received the incorrect item, you are eligible for an exchange within 7 days of receipt.</p>
      <h2>2. How to Request an Exchange</h2>
      <p>Please initiate an exchange request from your dashboard or contact our support team. Exchanges are subject to inventory availability.</p>
    `,
  },
  {
    title: 'Refund Policy',
    slug: 'refund-policy',
    status: 'published' as 'published',
    seoMetadata: {
      title: 'Refund Policy - Siri Arts & Crafts',
      description: 'Guidelines on how and when refunds are processed.',
    },
    content: `
      <h2>1. Refund Process</h2>
      <p>Once your return or cancellation is approved, a refund will be processed to your original method of payment within 7-10 business days.</p>
      <h2>2. Partial Refunds</h2>
      <p>Partial refunds may be granted for items returned with missing parts, signs of use, or outside the return window.</p>
    `,
  },
  {
    title: 'Cancellation Policy',
    slug: 'cancellation-policy',
    status: 'published' as 'published',
    seoMetadata: {
      title: 'Cancellation Policy - Siri Arts & Crafts',
      description: 'Cancellation terms for orders, event bookings, and rentals.',
    },
    content: `
      <h2>1. Order Cancellations</h2>
      <p>Standard orders can be canceled within 24 hours of placement for a full refund. Custom orders cannot be canceled once production has begun.</p>
      <h2>2. Event Booking Cancellations</h2>
      <ul>
        <li>30+ days before event: 100% deposit refund.</li>
        <li>15-29 days before event: 50% deposit refund.</li>
        <li>Less than 15 days before event: No refund on deposit.</li>
      </ul>
      <h2>3. Rental Cancellations</h2>
      <p>Rental orders canceled within 48 hours of the scheduled pickup are non-refundable.</p>
    `,
  },
];

const seedPolicies = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/eventdecor';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    for (const policyData of policies) {
      const existing = await Policy.findOne({ slug: policyData.slug });
      if (existing) {
        await Policy.updateOne({ _id: existing._id }, { $set: policyData });
        console.log(`Updated policy: ${policyData.title}`);
      } else {
        await Policy.create(policyData);
        console.log(`Created policy: ${policyData.title}`);
      }
    }

    console.log('All policies successfully updated to website standards.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed policies:', error);
    process.exit(1);
  }
};

seedPolicies();
