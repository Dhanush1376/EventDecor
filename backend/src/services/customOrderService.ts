import mongoose from 'mongoose';
import Counter from '../models/Counter';
import CustomOrderConfig from '../models/CustomOrderConfig';
import CustomOrder from '../models/CustomOrder';
import OutboxEvent from '../models/OutboxEvent';
import Product from '../models/Product';
import logger from '../config/logger';

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

  static async submitCustomOrder(payload: any, user: any) {
    let configSnapshot = null;
    if (payload.configVersion) {
      const config = await CustomOrderConfig.findOne({ version: payload.configVersion }).lean();
      if (config) configSnapshot = config;
    }

    const orderData: Record<string, unknown> = {
      customer: user?._id || user?.id,
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
      if (payload.draftId && user?._id) {
        const draft = await CustomOrder.findOne({
          _id: payload.draftId,
          customer: user._id || user.id,
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
      const { createAdminNotification } = require('./notificationService');
      await createAdminNotification({
        title: 'New Custom Order Request',
        message: `${order.customerName || 'A customer'} submitted a custom ${order.occasion || 'event'} order request.`,
        type: 'custom_request',
        actionLink: `/admin/custom-orders/${order._id}`,
        metadata: {
          image:
            order.referenceImages && order.referenceImages.length > 0
              ? order.referenceImages[0]
              : null,
        },
      });
    } catch (notifErr) {
      logger.error('Failed to create admin notification for custom order:', notifErr);
    }

    // Emit socket event
    try {
      const { emitAdminNotification, emitAdminEvent } = require('../socket');
      emitAdminNotification({
        type: 'customOrder:newSubmission',
        orderId: order.orderId,
        customerName: order.customerName,
        occasion: order.occasion,
      });
      emitAdminEvent('custom_order_update', { orderId: order._id });
    } catch {
      // Ignored
    }

    // Emails are now dispatched reliably via the OutboxProcessor (CUSTOMORDER_CUSTOMORDERSUBMITTED)

    return order;
  }

  static async submitProductCustomization(payload: any, user: any) {
    // Static import used
    const product = await Product.findById(payload.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const productSnapshot = {
      productId: product._id.toString(),
      title: product.title,
      imageSrc: product.imageSrc,
      category: product.primaryCategory?.toString(),
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
      customer: user?._id || user?.id,
      customerEmail: user?.email || '',
      customerName: user.name,
      customerPhone: payload.customerPhone || user.phone,
      occasion: 'Product Customization',
      productType: product.primaryCategory || 'Custom Product',
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
      const { createAdminNotification } = require('./notificationService');
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
      const { emitAdminNotification, emitAdminEvent } = require('../socket');
      emitAdminNotification({
        type: 'customOrder:newSubmission',
        orderId: order.orderId,
        customerName: order.customerName,
        productTitle: product.title,
      });
      emitAdminEvent('custom_order_update', { orderId: order._id });
    } catch {
      // Ignored
    }

    // Emails are now dispatched reliably via the OutboxProcessor (CUSTOMORDER_PRODUCTCUSTOMIZATIONSUBMITTED)

    return order;
  }
}
