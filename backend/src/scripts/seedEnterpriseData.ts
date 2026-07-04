import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import ApprovalRequest from '../domains/system/models/ApprovalRequest';
import BusinessRule from '../domains/system/models/BusinessRule';
import PickList from '../domains/warehouse/models/PickList';
// Production Task might not exist yet, let's just seed rules, approvals, picklists
// Wait, I need to check if Production Task model exists

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('MongoDB Connected');

    // 1. Seed Business Rules
    await BusinessRule.deleteMany({});
    const rules = [
      {
        title: 'Auto-approve low-value returns',
        category: 'Returns',
        active: true,
        conditions: 'When the order value is under ₹1,000 and the return reason is not "Defective"',
        action: 'Automatically approve the return request',
      },
      {
        title: 'Flag high-value orders for manual review',
        category: 'Fraud Prevention',
        active: true,
        conditions: 'When the total order value exceeds ₹50,000',
        action: 'Require manual approval before processing',
      },
      {
        title: 'VIP Customer 10% auto-discount applied at checkout',
        category: 'Pricing & Promos',
        active: false,
        conditions: 'When the customer account has the "VIP" tag',
        action: 'Automatically apply a 10% discount to the cart',
      },
      {
        title: 'Low Inventory Vendor Restock Alert',
        category: 'Inventory Mgmt',
        active: true,
        conditions: 'When the stock level for any SKU falls below 5 units',
        action: 'Send a restock alert email to the vendor',
      },
    ];
    await BusinessRule.insertMany(rules);
    console.log('Business Rules Seeded');

    // 2. Seed Approval Requests
    await ApprovalRequest.deleteMany({});
    const approvals = [
      {
        type: 'High-Value Refund',
        requesterId: 'user1',
        requesterName: 'Alex Manager',
        details: 'Refunding ₹15,000 for order ORD-8899 due to damaged transit.',
        amount: '₹15,000',
        riskLevel: 'High',
        status: 'Pending',
        approveConsequence:
          '₹15,000 will be instantly deducted from merchant account and customer will receive an automated email.',
        rejectConsequence:
          'Refund denied. Alex Manager will be notified to handle alternative customer support.',
      },
      {
        type: 'Discount Override',
        requesterId: 'user2',
        requesterName: 'Sarah Sales',
        details: 'Applying 25% manual discount for corporate client.',
        amount: '25% Off',
        riskLevel: 'Medium',
        status: 'Pending',
        approveConsequence:
          'Discount applied to cart. Expected revenue drop of ~₹4,500 on this order.',
        rejectConsequence: 'Checkout blocked. Sarah will need to negotiate standard pricing.',
      },
      {
        type: 'Inventory Adjustment',
        requesterId: 'user3',
        requesterName: 'John Warehouse',
        details: 'Manually deducting 10 units of SKU-554 (Lost in warehouse during audit).',
        amount: '-10 Units',
        riskLevel: 'Medium',
        status: 'Pending',
        approveConsequence: 'Stock for SKU-554 will drop to 2. Low-stock alerts may be triggered.',
        rejectConsequence: 'Inventory remains unchanged. John will be asked to re-verify audit.',
      },
    ];
    await ApprovalRequest.insertMany(approvals);
    console.log('Approval Requests Seeded');

    // 3. Seed PickLists
    await PickList.deleteMany({});
    // Need a valid user ID for assignedTo, we can just fetch the first admin
    const User = require('../domains/users/models/User').default;
    const adminUser = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
    const adminId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

    const picklists = [
      {
        pickListId: 'PL-9002',
        items: [{ productId: new mongoose.Types.ObjectId(), sku: 'SKU-1', quantity: 2, picked: 0 }],
        status: 'pending',
        assignedTo: adminId,
        orderIds: [new mongoose.Types.ObjectId()],
      },
      {
        pickListId: 'PL-9005',
        items: [{ productId: new mongoose.Types.ObjectId(), sku: 'SKU-2', quantity: 1, picked: 0 }],
        status: 'in_progress',
        assignedTo: adminId,
        orderIds: [new mongoose.Types.ObjectId()],
      },
    ];
    await PickList.insertMany(picklists);
    console.log('PickLists Seeded');

    process.exit();
  } catch (error) {
    console.error('Error with data import:', error);
    process.exit(1);
  }
};

seedData();
