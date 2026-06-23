import mongoose from 'mongoose';
import Counter from '../models/Counter.js';
import CustomOrderConfig from '../models/CustomOrderConfig.js';
import CustomOrder from '../models/CustomOrder.js';
import OutboxEvent from '../models/OutboxEvent.js';
import Product from '../models/Product.js';
import { CustomOrderMailService } from './customOrderMailService.js';
import logger from '../config/logger.js';

export class CustomOrderService {
  // ─── HELPER: Generate Order ID ───
  static async generateOrderId(): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await Counter.findByIdAndUpdate(
      { _id: `customOrder_${year}` },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true },
    );
    return `CO-${year}-${String(counter.seq).padStart(6, '0')}`;
  }

  // ─── HELPER: Create Status History Entry ───
  static createStatusHistoryEntry(from: string, to: string, changedBy: string, note?: string) {
    return {
      from,
      to,
      changedBy,
      changedAt: new Date(),
      note,
    };
  }

  // ─── HELPER: Create Version Snapshot ───
  static createVersionSnapshot(
    order: any,
    snapshotType: 'quotation' | 'requirements' | 'files' | 'status' | 'full',
    createdBy: string,
  ) {
    const version = (order.versions?.length || 0) + 1;
    let data: Record<string, unknown> = {};

    switch (snapshotType) {
      case 'quotation':
        data = { quotation: order.quotation?.toObject?.() || order.quotation };
        break;
      case 'requirements':
        data = {
          customRequirements: order.customRequirements,
          customizationData: order.customizationData,
        };
        break;
      case 'files':
        data = {
          files: order.files,
          referenceImages: order.referenceImages,
          voiceNotes: order.voiceNotes,
          videoReferences: order.videoReferences,
        };
        break;
      case 'status':
        data = { status: order.status, priority: order.priority };
        break;
      case 'full':
        data = order.toObject ? order.toObject() : order;
        break;
    }

    return { version, snapshotType, data, createdBy, createdAt: new Date() };
  }

  static async submitCustomOrder(payload: any, user: any) {
    let configSnapshot = null;
    if (payload.configVersion) {
      const config = await CustomOrderConfig.findOne({ version: payload.configVersion }).lean();
      if (config) configSnapshot = config;
    }

    const orderData: Record<string, unknown> = {
      customerEmail: user?.email || payload.customerEmail,
      customerName: user?.name || payload.customerName || 'Valued Customer',
      customerPhone: payload.customerPhone || user?.phone,
      occasion: payload.occasion,
      productType: payload.productType,
      inspirationImages: payload.inspirationImages || [],
      customRequirements: payload.customRequirements,
      budget: payload.budget,
      quantity: payload.quantity || 1,
      eventDate: payload.eventDate,
      city: payload.city,
      bookingType: payload.bookingType || 'Video Meet',
      productId: payload.productId,
      productSnapshot: payload.productSnapshot,
      customizationData: payload.customizationData || [],

      customOrderType: payload.customOrderType || 'general',
      configVersion: payload.configVersion,
      configSnapshot,
      dynamicData: payload.dynamicData || {},
      eventDetails: payload.eventDetails || {},
      venueInformation: payload.venueInformation || {},
      displayRequirements: payload.displayRequirements || {},
      generalRequirements: payload.generalRequirements || {},
      projectRequirements: payload.projectRequirements || {},
      customSpecifications: payload.customSpecifications || {},

      isDraft: false,
      statusHistory: [
        {
          from: 'New',
          to: 'Pending',
          changedBy: 'system',
          changedAt: new Date(),
          note: 'Order submitted',
        },
      ],
      messages: [
        {
          sender: 'admin' as const,
          senderName: 'Siri Arts & Crafts',
          text: 'Welcome to your custom design workspace! Our design team is currently reviewing your blueprint and inspiration images.',
          createdAt: new Date(),
        },
      ],
    };

    // (Static imports used instead)

    const session = await mongoose.startSession();
    session.startTransaction();
    let order: Record<string, unknown> | any;

    try {
      if (payload.draftId && user?.email) {
        const draft = await CustomOrder.findOne({
          _id: payload.draftId,
          customerEmail: user.email,
          isDraft: true,
        });
        if (draft) {
          Object.assign(draft, orderData);
          order = await draft.save({ session });
        } else {
          const orders = await CustomOrder.create([orderData], { session });
          order = orders[0];
        }
      } else {
        const orders = await CustomOrder.create([orderData], { session });
        order = orders[0];
      }

      await OutboxEvent.create(
        [
          {
            aggregateId: order._id.toString(),
            aggregateType: 'CustomOrder',
            eventType: 'CustomOrderSubmitted',
            payload: { orderId: order._id.toString() },
          },
        ],
        { session },
      );

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    // Admin real-time notification
    try {
      const { createAdminNotification } = require('../controllers/adminNotificationController');
      await createAdminNotification({
        title: 'New Custom Order Request',
        message: `${order.customerName || 'A customer'} submitted a custom ${order.occasion || 'event'} order request.`,
        type: 'custom_request',
        actionLink: `/admin/custom-orders/${order._id}`,
      });
    } catch (notifErr) {
      logger.error('Failed to create admin notification for custom order:', notifErr);
    }

    // Emit socket event
    try {
      const { emitAdminNotification } = require('../socket');
      emitAdminNotification({
        type: 'customOrder:newSubmission',
        orderId: order.orderId,
        customerName: order.customerName,
        occasion: order.occasion,
      });
    } catch {
      // Ignored
    }

    // Send emails
    try {
      await CustomOrderMailService.sendSubmissionEmails(order);
    } catch (emailErr) {
      logger.error('Failed to send custom order submission emails:', emailErr);
    }

    return order;
  }

  static async submitProductCustomization(payload: any, user: any) {
    // Static import used
    const product = await Product.findById(payload.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const orderId = await CustomOrderService.generateOrderId();

    const productSnapshot = {
      productId: product._id.toString(),
      title: product.title,
      imageSrc: product.imageSrc,
      category: product.category,
      price: product.price,
      description: product.description,
      variants: product.variants?.map((v: any) => ({
        name: v.name,
        value: v.value,
        price: v.price,
      })),
      material: product.material,
      dimensions: product.dimensions,
    };

    const orderData = {
      orderId,
      customerEmail: user.email,
      customerName: user.name,
      customerPhone: payload.customerPhone || user.phone,
      occasion: 'Product Customization',
      productType: product.category || 'Custom Product',
      productId: product._id,
      productSnapshot,
      customizationData: payload.customizationData || [],
      customRequirements: payload.customRequirements,
      files: payload.files || [],
      referenceImages: payload.referenceImages || [],
      voiceNotes: payload.voiceNotes || [],
      videoReferences: payload.videoReferences || [],
      annotations: payload.annotations || [],
      costEstimation: payload.costEstimation || {},
      quantity: payload.quantity || 1,
      eventDate: payload.eventDate,
      city: payload.city,
      bookingType: 'Product Customization',
      budget: payload.costEstimation?.total || product.price,

      customOrderType: 'product',
      configVersion: payload.configVersion,
      dynamicData: payload.dynamicData || {},

      statusHistory: [
        {
          from: 'New',
          to: 'Pending',
          changedBy: 'system',
          changedAt: new Date(),
          note: `Product customization submitted for "${product.title}"`,
        },
      ],
      messages: [
        {
          sender: 'admin' as const,
          senderName: 'Siri Arts & Crafts',
          text: `Thank you for your customization request for "${product.title}"! Our artisan team is reviewing your specifications and will provide a detailed quotation shortly.`,
          createdAt: new Date(),
        },
      ],
    };

    // (Static imports used instead)

    const session = await mongoose.startSession();
    session.startTransaction();
    let order: Record<string, unknown> | any;
    try {
      const orders = await CustomOrder.create([orderData as any], { session });
      order = orders[0];

      await OutboxEvent.create(
        [
          {
            aggregateId: order._id.toString(),
            aggregateType: 'CustomOrder',
            eventType: 'ProductCustomizationSubmitted',
            payload: {
              orderId: order._id.toString(),
              productId: product._id.toString(),
              productTitle: product.title,
            },
          },
        ],
        { session },
      );

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    // Admin notification
    try {
      const { createAdminNotification } = require('../controllers/adminNotificationController');
      await createAdminNotification({
        title: 'New Product Customization',
        message: `${order.customerName} wants to customize "${product.title}"`,
        type: 'custom_request',
        actionLink: `/admin/custom-orders/${order._id}`,
      });
    } catch (notifErr) {
      logger.error('Failed to create admin notification for product customization:', notifErr);
    }

    // Emit socket event
    try {
      const { emitAdminNotification } = require('../socket');
      emitAdminNotification({
        type: 'customOrder:newSubmission',
        orderId: order.orderId,
        customerName: order.customerName,
        productTitle: product.title,
      });
    } catch {
      // Ignored
    }

    // Send emails
    try {
      await CustomOrderMailService.sendSubmissionEmails(order);
    } catch (emailErr) {
      logger.error('Failed to send product customization submission emails:', emailErr);
    }

    return order;
  }
}
