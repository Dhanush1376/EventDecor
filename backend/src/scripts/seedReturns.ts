import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ReturnRequest from '../models/ReturnRequest';
import RefundRecord from '../models/RefundRecord';
import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';

dotenv.config({ path: '.env.local' });
dotenv.config();

const seedReturns = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/eventdecor';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // 1. Clear existing returns and refunds
    await ReturnRequest.deleteMany({});
    await RefundRecord.deleteMany({});
    console.log('Cleared existing returns and refunds');

    // 2. Get random user and product to attach returns to
    const user = (await User.findOne({ role: 'user' })) || (await User.findOne());
    const product = await Product.findOne();
    const order = await Order.findOne();

    if (!user || !product) {
      console.log('No user or product found in database. Exiting seed script.');
      process.exit(1);
    }

    const userId = user._id;
    const productId = product._id;
    const orderId = order ? order._id : new mongoose.Types.ObjectId(); // Fallback if no order exists

    // 3. Create mock returns representing real scenarios

    // Scenarios:
    // A: Submitted (Pending Approval)
    // B: Approved (Waiting for Pickup)
    // C: Completed (Refund Triggered)
    // D: High Risk / Fraudulent (Pending)
    // E: Exchange Request

    const returns = [];
    const refunds = [];

    // Return A: Submitted
    returns.push({
      returnId: 'RET-10001',
      orderId,
      userId,
      returnType: 'return',
      status: 'submitted',
      priority: 'medium',
      refundMethod: 'wallet',
      fraudScore: 5,
      items: [
        {
          productId,
          title: product.title,
          orderedQuantity: 1,
          returnQuantity: 1,
          unitPrice: product.price,
          reason: 'Changed my mind',
          warehouseStatus: 'pending',
        },
      ],
      refundBreakdown: { productTotal: product.price, grandTotal: product.price },
      sla: {
        currentStage: 'submitted',
        stageEnteredAt: new Date(),
        isOverdue: false,
        escalated: false,
      },
      timeline: [{ action: 'Request Submitted', timestamp: new Date() }],
    });

    // Return B: Approved (Waiting for Pickup)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    returns.push({
      returnId: 'RET-10002',
      orderId,
      userId,
      returnType: 'return',
      status: 'approved',
      priority: 'high',
      refundMethod: 'original',
      upiId: 'test@upi',
      fraudScore: 10,
      items: [
        {
          productId,
          title: product.title,
          orderedQuantity: 2,
          returnQuantity: 1,
          unitPrice: product.price,
          reason: 'Defective / Damaged',
          warehouseStatus: 'pending',
        },
      ],
      refundBreakdown: { productTotal: product.price, grandTotal: product.price },
      pickup: {
        address: { name: 'Test User', addressLine1: '123 Main St', city: 'Mumbai' },
        status: 'pending',
      },
      sla: {
        currentStage: 'approved',
        stageEnteredAt: twoDaysAgo,
        isOverdue: true,
        escalated: true,
      },
      timeline: [{ action: 'Request Approved', timestamp: twoDaysAgo }],
    });

    // Return C: Completed (Refunded)
    const reqC = new mongoose.Types.ObjectId();
    const refC = new mongoose.Types.ObjectId();
    returns.push({
      _id: reqC,
      returnId: 'RET-10003',
      orderId,
      userId,
      returnType: 'return',
      status: 'completed',
      priority: 'low',
      refundMethod: 'wallet',
      fraudScore: 0,
      refundRecordId: refC,
      items: [
        {
          productId,
          title: product.title,
          orderedQuantity: 1,
          returnQuantity: 1,
          unitPrice: product.price,
          reason: 'Wrong Item Sent',
          warehouseStatus: 'quality_passed',
          inspectionResult: { inspectionScore: 100 },
        },
      ],
      refundBreakdown: { productTotal: product.price, grandTotal: product.price },
      sla: {
        currentStage: 'completed',
        stageEnteredAt: new Date(),
        isOverdue: false,
        escalated: false,
      },
      timeline: [{ action: 'Refund Processed', timestamp: new Date() }],
    });

    refunds.push({
      _id: refC,
      amount: product.price,
      currency: 'INR',
      originalTransactionId: 'txn_mock_123',
      entityType: 'Order',
      entityId: orderId,
      status: 'completed',
      returnRequestId: reqC,
      refundMethod: 'wallet',
      completedAt: new Date(),
    });

    // Return D: Fraudulent (High Score)
    returns.push({
      returnId: 'RET-10004',
      orderId,
      userId,
      returnType: 'return',
      status: 'submitted',
      priority: 'critical',
      refundMethod: 'original',
      fraudScore: 85, // High risk
      items: [
        {
          productId,
          title: product.title,
          orderedQuantity: 1,
          returnQuantity: 1,
          unitPrice: product.price,
          reason: "Product doesn't match description",
          warehouseStatus: 'pending',
        },
      ],
      refundBreakdown: { productTotal: product.price, grandTotal: product.price },
      sla: {
        currentStage: 'submitted',
        stageEnteredAt: new Date(),
        isOverdue: false,
        escalated: false,
      },
      timeline: [{ action: 'Flagged for fraud review', timestamp: new Date() }],
    });

    // Return E: Exchange Request
    returns.push({
      returnId: 'EXC-20001',
      orderId,
      userId,
      returnType: 'exchange',
      status: 'inspection_started',
      priority: 'medium',
      fraudScore: 0,
      items: [
        {
          productId,
          title: product.title,
          orderedQuantity: 1,
          returnQuantity: 1,
          unitPrice: product.price,
          reason: 'Size too small/large',
          warehouseStatus: 'received',
        },
      ],
      pickup: {
        address: { name: 'Test User', addressLine1: '123 Main St', city: 'Mumbai' },
        status: 'picked_up',
        partner: 'Delhivery',
      },
      sla: {
        currentStage: 'inspection_started',
        stageEnteredAt: new Date(),
        isOverdue: false,
        escalated: false,
      },
      timeline: [{ action: 'Inspection Started', timestamp: new Date() }],
    });

    // 4. Save to DB
    await ReturnRequest.insertMany(returns);
    if (refunds.length > 0) {
      await RefundRecord.insertMany(refunds);
    }

    console.log(
      `Successfully seeded ${returns.length} Return Requests and ${refunds.length} Refund Records.`,
    );
  } catch (error) {
    console.error('Error seeding returns data:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedReturns();
