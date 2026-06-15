import { Request, Response } from 'express';
import CustomOrder from '../models/CustomOrder';
import Product from '../models/Product';
import WebsiteContent from '../models/WebsiteContent';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import { CustomOrderMailService } from '../services/customOrderMailService';
import logger from '../config/logger';
import { ADMIN_ROLES } from '../config/adminConfig';
import mongoose from 'mongoose';
import OutboxEvent from '../models/OutboxEvent';
import CustomOrderConfig from '../models/CustomOrderConfig';

// DEFAULT CONFIG OPTIONS
const DEFAULT_CONFIG = {
  occasions: [
    { id: 'wedding', label: 'Wedding / Vivaham', enabled: true },
    { id: 'haldi', label: 'Haldi & Mehndi Ceremony', enabled: true },
    { id: 'reception', label: 'Reception Style Gala', enabled: true },
    { id: 'housewarming', label: 'Housewarming / Gruhapravesam', enabled: true },
    { id: 'baby_shower', label: 'Baby Shower / Seemantham', enabled: true },
    { id: 'corporate', label: 'Corporate & Banquet Decor', enabled: true },
    { id: 'other', label: 'Custom Festive Gathering', enabled: true },
  ],
  productTypes: [
    { id: 'mandapam', label: 'Full Mandapam Setup', enabled: true },
    { id: 'backdrop', label: 'Floral Backdrop Curations', enabled: true },
    { id: 'lounge', label: 'Luxury Reception Lounge', enabled: true },
    { id: 'table_scapes', label: 'Artisanal Table Centerpieces', enabled: true },
    { id: 'entrance', label: 'Grand Archways & Entrances', enabled: true },
    { id: 'brass_props', label: 'Handcrafted Brass Installations', enabled: true },
    { id: 'other', label: 'Bespoke Custom Artifacts', enabled: true },
  ],
  themes: [
    { id: 'traditional', label: 'Royal South Indian Heritage', enabled: true },
    { id: 'marigold_blast', label: 'Haldi Vibrant Yellows & Golds', enabled: true },
    { id: 'modern_gold', label: 'Contemporary Glassmorphism & Gold', enabled: true },
    { id: 'pastel_palace', label: 'Soft Pastel Florals & Ivory', enabled: true },
    { id: 'minimalist', label: 'Minimalist Wooden Craftsmanship', enabled: true },
  ],
  budgetRanges: [
    { id: 'low', label: '₹10,000 - ₹50,000', enabled: true },
    { id: 'medium', label: '₹50,000 - ₹1,500,000', enabled: true },
    { id: 'high', label: '₹1,500,000 - ₹5,000,000', enabled: true },
    { id: 'ultra', label: '₹5,000,000+', enabled: true },
  ],
  bookingTypes: [
    { id: 'video', label: 'Premium Video Consultation', enabled: true },
    { id: 'call', label: 'Direct Audio Conference', enabled: true },
    { id: 'in_person', label: 'In-Studio Creative Meeting', enabled: true },
  ],
};

// ─── HELPER: Generate Order ID ───
import Counter from '../models/Counter';

const generateOrderId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const counter = await Counter.findByIdAndUpdate(
    { _id: `customOrder_${year}` },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true },
  );
  return `CO-${year}-${String(counter.seq).padStart(6, '0')}`;
};

// ─── HELPER: Create Status History Entry ───
const createStatusHistoryEntry = (from: string, to: string, changedBy: string, note?: string) => ({
  from,
  to,
  changedBy,
  changedAt: new Date(),
  note,
});

// ─── HELPER: Create Version Snapshot ───
const createVersionSnapshot = (
  order: any,
  snapshotType: 'quotation' | 'requirements' | 'files' | 'status' | 'full',
  createdBy: string,
) => {
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
};

// 1. Submit Custom Order (Customer) — Original flow
export const submitCustomOrder = asyncHandler(async (req: any, res: Response) => {
  const {
    occasion,
    productType,
    inspirationImages,
    customRequirements,
    budget,
    quantity,
    eventDate,
    city,
    bookingType,
    customerPhone,
    productId,
    productSnapshot,
    customizationData,
    draftId,
  } = req.body;

  let configSnapshot = null;
  if (req.body.configVersion) {
    const config = await CustomOrderConfig.findOne({ version: req.body.configVersion }).lean();
    if (config) configSnapshot = config;
  }

  const orderData: any = {
    customerEmail: req.user?.email || req.body.customerEmail,
    customerName: req.user?.name || req.body.customerName || 'Valued Customer',
    customerPhone: customerPhone || req.user?.phone,
    occasion,
    productType,
    inspirationImages: inspirationImages || [],
    customRequirements,
    budget,
    quantity: quantity || 1,
    eventDate,
    city,
    bookingType: bookingType || 'Video Meet',
    productId,
    productSnapshot,
    customizationData: customizationData || [],

    // V2 Dynamic payload
    customOrderType: req.body.customOrderType || 'general',
    configVersion: req.body.configVersion,
    configSnapshot,
    dynamicData: req.body.dynamicData || {},
    eventDetails: req.body.eventDetails || {},
    venueInformation: req.body.venueInformation || {},
    displayRequirements: req.body.displayRequirements || {},
    generalRequirements: req.body.generalRequirements || {},
    projectRequirements: req.body.projectRequirements || {},
    customSpecifications: req.body.customSpecifications || {},

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

  const session = await mongoose.startSession();
  session.startTransaction();
  let order: any;
  try {
    if (draftId && req.user?.email) {
      const draft = await CustomOrder.findOne({
        _id: draftId,
        customerEmail: req.user.email,
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
    const { createAdminNotification } = require('./adminNotificationController');
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
  } catch (_) {}

  // Send emails
  try {
    await CustomOrderMailService.sendSubmissionEmails(order);
  } catch (emailErr) {
    logger.error('Failed to send custom order submission emails:', emailErr);
  }

  res.status(201).json(new ApiResponse(true, 'Custom order request lodged successfully', order));
});

// 2. Submit Product Customization (Customer) — New product-linked flow
export const submitProductCustomization = asyncHandler(async (req: any, res: Response) => {
  const {
    productId,
    customizationData,
    customRequirements,
    files,
    referenceImages,
    voiceNotes,
    videoReferences,
    annotations,
    costEstimation,
    customerPhone,
    quantity,
    eventDate,
    city,
  } = req.body;

  // Fetch and snapshot the product
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404).json(new ApiResponse(false, 'Product not found'));
    return;
  }

  const orderId = await generateOrderId();

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
    customerEmail: req.user.email,
    customerName: req.user.name,
    customerPhone: customerPhone || req.user.phone,
    occasion: 'Product Customization',
    productType: product.category || 'Custom Product',
    productId: product._id,
    productSnapshot,
    customizationData: customizationData || [],
    customRequirements,
    files: files || [],
    referenceImages: referenceImages || [],
    voiceNotes: voiceNotes || [],
    videoReferences: videoReferences || [],
    annotations: annotations || [],
    costEstimation: costEstimation || {},
    quantity: quantity || 1,
    eventDate,
    city,
    bookingType: 'Product Customization',
    budget: costEstimation?.total || product.price,

    // V2 Dynamic payload
    customOrderType: 'product',
    configVersion: req.body.configVersion,
    dynamicData: req.body.dynamicData || {},

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

  const session = await mongoose.startSession();
  session.startTransaction();
  let order: any;
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
    const { createAdminNotification } = require('./adminNotificationController');
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
  } catch (_) {}

  // Send emails
  try {
    await CustomOrderMailService.sendSubmissionEmails(order);
  } catch (emailErr) {
    logger.error('Failed to send product customization submission emails:', emailErr);
  }

  res
    .status(201)
    .json(new ApiResponse(true, 'Product customization request submitted successfully', order));
});

// 3. Save Draft (Customer)
export const saveDraft = asyncHandler(async (req: any, res: Response) => {
  const {
    productId,
    customizationData,
    customRequirements,
    files,
    referenceImages,
    costEstimation,
    draftId,
  } = req.body;

  const draftData: any = {
    customerEmail: req.user.email,
    customerName: req.user.name,
    customerPhone: req.user.phone,
    occasion: 'Product Customization',
    productType: 'Draft',
    isDraft: true,
    customizationData: customizationData || [],
    customRequirements,
    files: files || [],
    referenceImages: referenceImages || [],
    costEstimation: costEstimation || {},
  };

  // Snapshot the product if provided
  if (productId) {
    const product = await Product.findById(productId);
    if (product) {
      draftData.productId = product._id;
      draftData.productSnapshot = {
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
      draftData.productType = product.category || 'Custom Product';
    }
  }

  let draft;
  if (draftId) {
    // Update existing draft
    draft = await CustomOrder.findOneAndUpdate(
      { _id: draftId, customerEmail: req.user.email, isDraft: true },
      { $set: draftData },
      { returnDocument: 'after' },
    );
    if (!draft) {
      res.status(404).json(new ApiResponse(false, 'Draft not found'));
      return;
    }
  } else {
    // Create new draft
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const drafts = await CustomOrder.create([draftData], { session });
      draft = drafts[0];
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  res.status(200).json(new ApiResponse(true, 'Draft saved successfully', draft));
});

// 4. Get My Drafts (Customer)
export const getMyDrafts = asyncHandler(async (req: any, res: Response) => {
  const drafts = await CustomOrder.find({
    customerEmail: req.user.email,
    isDraft: true,
  })
    .sort({ updatedAt: -1 })
    .lean();

  res.status(200).json(new ApiResponse(true, 'Drafts retrieved', drafts));
});

// 5. Delete Draft (Customer)
export const deleteDraft = asyncHandler(async (req: any, res: Response) => {
  const draft = await CustomOrder.findOneAndDelete({
    _id: req.params.id,
    customerEmail: req.user.email,
    isDraft: true,
  });

  if (!draft) {
    res.status(404).json(new ApiResponse(false, 'Draft not found'));
    return;
  }

  res.status(200).json(new ApiResponse(true, 'Draft deleted successfully'));
});

// 6. Get My Custom Orders (Customer)
export const getMyCustomOrders = asyncHandler(async (req: any, res: Response) => {
  const email = req.user?.email;
  const orders = await CustomOrder.find({ customerEmail: email, isDraft: { $ne: true } })
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json(new ApiResponse(true, 'My custom orders synced', orders));
});

// 7. Get Single Custom Order (Customer or Admin)
export const getSingleCustomOrder = asyncHandler(async (req: any, res: Response) => {
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order details not found'));
    return;
  }

  // Ensure security boundaries
  if (!ADMIN_ROLES.includes(req.user.role as any) && order.customerEmail !== req.user.email) {
    res.status(403).json(new ApiResponse(false, 'Unauthorized view access restricted'));
    return;
  }

  res.status(200).json(new ApiResponse(true, 'Custom order fetched', order));
});

// 8. Admin Search & Pipeline (Admin Only)
export const adminGetCustomOrders = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 15;
  const skip = (page - 1) * limit;

  const filterQuery: any = { isDraft: { $ne: true } };

  // Filters
  if (req.query.status) {
    filterQuery.status = req.query.status;
  }
  if (req.query.priority) {
    filterQuery.priority = req.query.priority;
  }
  if (req.query.archived) {
    filterQuery.archived = req.query.archived === 'true';
  } else {
    filterQuery.archived = false; // Default to non-archived
  }
  if (req.query.assignedTo) {
    filterQuery['assignedStaff.userId'] = req.query.assignedTo;
  }
  if (req.query.hasProduct) {
    filterQuery.productId = { $exists: req.query.hasProduct === 'true' };
  }
  if (req.query.orderType) {
    filterQuery.customOrderType = req.query.orderType;
  }

  // Text Search matches customer name, email, occasion, productType, or orderId
  if (req.query.search) {
    const searchString = String(req.query.search).toLowerCase();
    filterQuery.$or = [
      { customerName: { $regex: searchString, $options: 'i' } },
      { customerEmail: { $regex: searchString, $options: 'i' } },
      { occasion: { $regex: searchString, $options: 'i' } },
      { productType: { $regex: searchString, $options: 'i' } },
      { city: { $regex: searchString, $options: 'i' } },
      { orderId: { $regex: searchString, $options: 'i' } },
    ];
  }

  const [orders, total] = await Promise.all([
    CustomOrder.find(filterQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CustomOrder.countDocuments(filterQuery),
  ]);

  res.status(200).json(
    new ApiResponse(true, 'Custom orders catalog matched', {
      items: orders,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    }),
  );
});

// 9. Admin Update Status
export const adminUpdateStatus = asyncHandler(async (req: any, res: Response) => {
  const { status, __v } = req.body;
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  const prevStatus = order.status;

  // BUG-10: Status transition validation
  const terminalStatuses = ['Completed', 'Delivered', 'Cancelled'];
  if (terminalStatuses.includes(prevStatus) && status !== prevStatus) {
    res
      .status(400)
      .json(new ApiResponse(false, `Cannot change status from terminal state: ${prevStatus}`));
    return;
  }

  const versionSnapshot = createVersionSnapshot(order, 'status', req.user?.email || 'admin');
  const historyEntry = createStatusHistoryEntry(
    prevStatus,
    status,
    req.user?.email || 'admin',
    `Status changed by admin`,
  );
  const messageEntry = {
    sender: 'admin',
    senderName: 'System Logger',
    text: `Workspace status transition: Changed from "${prevStatus}" to "${status}".`,
    createdAt: new Date(),
  };

  const updatedOrder = await CustomOrder.findOneAndUpdate(
    { _id: order._id, __v: __v !== undefined ? __v : order.__v },
    {
      $set: { status },
      $push: {
        versions: versionSnapshot,
        statusHistory: historyEntry,
        messages: messageEntry,
      },
      $inc: { __v: 1 },
    },
    { returnDocument: 'after' },
  );

  if (!updatedOrder) {
    res
      .status(409)
      .json(
        new ApiResponse(
          false,
          'Order has been modified by another user. Please refresh and try again.',
        ),
      );
    return;
  }

  // Use updatedOrder for subsequent operations
  const finalOrder = updatedOrder;

  // WF-06: Send status change email
  try {
    await CustomOrderMailService.sendStatusChangeEmail(finalOrder, prevStatus);
  } catch (emailErr) {
    logger.error('Failed to send status change email:', emailErr);
  }

  // Emit socket event to customer
  try {
    const { emitUserEvent } = require('../socket');
    // Find user by email to get userId for socket room
    const User = require('../models/User').default;
    const user = await User.findOne({ email: finalOrder.customerEmail });
    if (user) {
      emitUserEvent(user._id.toString(), 'customOrder:statusChange', {
        orderId: finalOrder.orderId,
        status: finalOrder.status,
        previousStatus: prevStatus,
      });
    }
  } catch (_) {}

  res.status(200).json(new ApiResponse(true, 'Order status updated', finalOrder));
});

// 10. Admin Update Priority
export const adminUpdatePriority = asyncHandler(async (req: Request, res: Response) => {
  const { priority } = req.body;
  const order = await CustomOrder.findByIdAndUpdate(
    req.params.id,
    { priority },
    { returnDocument: 'after', runValidators: true },
  );

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  res.status(200).json(new ApiResponse(true, 'Priority status elevated', order));
});

// 11. Admin Update Notes (legacy single string)
export const adminUpdateNotes = asyncHandler(async (req: Request, res: Response) => {
  const { adminNotes } = req.body;
  const order = await CustomOrder.findByIdAndUpdate(
    req.params.id,
    { adminNotes },
    { returnDocument: 'after' },
  );

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  res.status(200).json(new ApiResponse(true, 'Internal curators notes saved', order));
});

// 12. Admin Add Internal Note
export const adminAddInternalNote = asyncHandler(async (req: any, res: Response) => {
  const { text } = req.body;
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  order.internalNotes.push({
    author: req.user._id?.toString() || req.user.email,
    authorName: req.user.name || 'Admin',
    text,
    createdAt: new Date(),
  });

  await order.save();
  res.status(200).json(new ApiResponse(true, 'Internal note added', order));
});

// 13. Admin Assign Staff
export const adminAssignStaff = asyncHandler(async (req: any, res: Response) => {
  const { staffAssignments } = req.body; // [{ userId, role }]
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  // WF-10: Optimistic locking
  if (req.body.__v !== undefined && order.__v !== req.body.__v) {
    res
      .status(409)
      .json(
        new ApiResponse(
          false,
          'Order has been modified by another user. Please refresh and try again.',
        ),
      );
    return;
  }

  // BUG-11: Additive logic for staff assignment
  const existingStaff = order.assignedStaff || [];
  const newAssignments = staffAssignments
    .filter(
      (newStaff: any) =>
        !existingStaff.some(
          (existing: any) => existing.userId.toString() === newStaff.userId.toString(),
        ),
    )
    .map((s: any) => ({
      userId: s.userId,
      role: s.role || 'designer',
      assignedBy: req.user._id?.toString() || req.user.email,
    }));

  order.assignedStaff = [...existingStaff, ...newAssignments];

  // Add system message
  const staffNames = staffAssignments.map((s: any) => s.role || 'staff').join(', ');
  order.messages.push({
    sender: 'admin',
    senderName: 'System Logger',
    text: `Staff assigned: ${staffNames}`,
    createdAt: new Date(),
  });

  await order.save();
  res.status(200).json(new ApiResponse(true, 'Staff assigned successfully', order));
});

// 14. Admin Manage Quotation
export const adminUpdateQuotation = asyncHandler(async (req: any, res: Response) => {
  const { items, tax, shipping, notes, status: quoteStatus } = req.body;
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  // Create version snapshot before update
  order.versions.push(createVersionSnapshot(order, 'quotation', req.user?.email || 'admin') as any);

  const calculatedItems = items || [];
  const itemsSum = calculatedItems.reduce(
    (acc: number, item: any) => acc + (Number(item.amount) || 0),
    0,
  );
  const taxVal = Number(tax) || 0;
  const shippingVal = Number(shipping) || 0;
  const grandTotal = itemsSum + taxVal + shippingVal;

  order.quotation = {
    items: calculatedItems,
    tax: taxVal,
    shipping: shippingVal,
    total: grandTotal,
    notes,
    status: quoteStatus || 'draft',
  };

  // If quote is sent, shift entire workspace status
  if (quoteStatus === 'sent') {
    const prevStatus = order.status;
    order.status = 'Quote Sent';

    order.statusHistory.push(
      createStatusHistoryEntry(
        prevStatus,
        'Quote Sent',
        req.user?.email || 'admin',
        'Quotation sent to customer',
      ) as any,
    );

    order.messages.push({
      sender: 'admin',
      senderName: 'System Logger',
      text: `An itemized studio estimate totaling ₹${grandTotal.toLocaleString('en-IN')} has been compiled and dispatched for review.`,
      createdAt: new Date(),
    });

    // Trigger quotation email asynchronously
    CustomOrderMailService.sendQuotationEmail(order).catch((err) =>
      logger.error('Quotation email error:', err),
    );

    // Emit socket event
    try {
      const { emitUserEvent } = require('../socket');
      const User = require('../models/User').default;
      const customer = await User.findOne({ email: order.customerEmail }).select('_id');
      if (customer) {
        emitUserEvent(customer._id.toString(), 'customOrder:quoteCreated', {
          orderId: order.orderId,
          total: grandTotal,
        });
      }
    } catch (_) {}
  }

  await order.save();
  res.status(200).json(new ApiResponse(true, 'Quotation state synchronized', order));
});

// 15. Customer Respond to Quotation (Accept/Reject)
export const customerRespondQuotation = asyncHandler(async (req: any, res: Response) => {
  const { status } = req.body; // 'approved' or 'rejected'
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  // BUG-09: Status gate
  if (order.status !== 'Quote Sent') {
    res
      .status(400)
      .json(
        new ApiResponse(
          false,
          'Quotation response is only allowed when order is in Quote Sent status',
        ),
      );
    return;
  }

  if (order.customerEmail !== req.user.email) {
    res.status(403).json(new ApiResponse(false, 'Access restricted to order owner'));
    return;
  }

  const prevStatus = order.status;
  order.quotation.status = status;

  if (status === 'approved') {
    order.status = 'Approved';
    order.statusHistory.push(
      createStatusHistoryEntry(
        prevStatus,
        'Approved',
        req.user.email,
        'Customer approved quotation',
      ) as any,
    );
    order.messages.push({
      sender: 'customer',
      senderName: order.customerName,
      text: `I have APPROVED the provided estimate. Ready to proceed with scheduling and deposit transactions!`,
      createdAt: new Date(),
    });
  } else {
    order.status = 'Reviewing';
    order.statusHistory.push(
      createStatusHistoryEntry(
        prevStatus,
        'Reviewing',
        req.user.email,
        'Customer requested changes to quotation',
      ) as any,
    );
    order.messages.push({
      sender: 'customer',
      senderName: order.customerName,
      text: `I have requested modifications on the quotation. Let's adjust the scope items.`,
      createdAt: new Date(),
    });
  }

  await order.save();

  // Trigger response notification emails
  CustomOrderMailService.sendQuotationResponseEmail(order, status).catch((err) =>
    logger.error('Quotation response email error:', err),
  );

  res.status(200).json(new ApiResponse(true, 'Quotation response lodged', order));
});

// 16. Post Message Thread Note / Reference
export const postMessage = asyncHandler(async (req: any, res: Response) => {
  const { text, attachments } = req.body;
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  const isSenderAdmin = ADMIN_ROLES.includes(req.user.role as any);

  if (!isSenderAdmin && order.customerEmail !== req.user.email) {
    res.status(403).json(new ApiResponse(false, 'Unauthorized message dispatch restricted'));
    return;
  }

  // SEC-08: Terminal-state guard
  if (!isSenderAdmin && ['Completed', 'Delivered', 'Cancelled'].includes(order.status)) {
    res
      .status(400)
      .json(new ApiResponse(false, 'Cannot send messages on a completed or cancelled order'));
    return;
  }

  // SEC-06: Validate attachment URLs
  const validAttachments = (attachments || []).filter((url: string) => {
    return (
      url &&
      typeof url === 'string' &&
      (url.includes('res.cloudinary.com') || url.startsWith('http'))
    );
  });

  order.messages.push({
    sender: isSenderAdmin ? 'admin' : 'customer',
    senderName: isSenderAdmin ? 'Siri Design Team' : order.customerName,
    text,
    attachments: validAttachments,
    createdAt: new Date(),
  });

  await order.save();

  // Trigger chat message email asynchronously
  CustomOrderMailService.sendChatMessageEmail(
    order,
    isSenderAdmin ? 'Siri Design Team' : order.customerName,
    isSenderAdmin ? 'admin' : 'customer',
    text,
  ).catch((err) => logger.error('Chat message notification email error:', err));

  // Emit socket event
  try {
    const { emitUserEvent, emitAdminNotification } = require('../socket');
    if (isSenderAdmin) {
      const User = require('../models/User').default;
      const customer = await User.findOne({ email: order.customerEmail }).select('_id');
      if (customer) {
        emitUserEvent(customer._id.toString(), 'customOrder:newMessage', {
          orderId: order.orderId,
          senderName: 'Siri Design Team',
        });
      }
    } else {
      emitAdminNotification({
        type: 'customOrder:newMessage',
        orderId: order.orderId,
        customerName: order.customerName,
      });
    }
  } catch (_) {}

  res.status(200).json(new ApiResponse(true, 'Message dispatched', order));
});

// 17. Get Status/Version History
export const getOrderHistory = asyncHandler(async (req: any, res: Response) => {
  const order = await CustomOrder.findById(req.params.id)
    .select('statusHistory versions orderId')
    .lean();

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  // BUG-02: Auth check
  const isSenderAdmin = ADMIN_ROLES.includes(req.user.role as any);
  if (!isSenderAdmin && order.customerEmail !== req.user.email) {
    res.status(403).json(new ApiResponse(false, 'Access restricted to order owner'));
    return;
  }

  res.status(200).json(
    new ApiResponse(true, 'Order history retrieved', {
      statusHistory: order.statusHistory || [],
      versions: order.versions || [],
    }),
  );
});

// 18. Admin Archive Request
export const adminArchiveOrder = asyncHandler(async (req: Request, res: Response) => {
  const { archived } = req.body;
  const order = await CustomOrder.findByIdAndUpdate(
    req.params.id,
    { archived: archived !== false },
    { returnDocument: 'after' },
  );

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  res
    .status(200)
    .json(new ApiResponse(true, archived ? 'Order archived' : 'Order restored', order));
});

export const getCustomOrderConfig = asyncHandler(async (req: Request, res: Response) => {
  // Try to find the active V2 configuration (MUST be published)
  const config = await CustomOrderConfig.findOne({ isActive: true, status: 'published' })
    .sort({ version: -1 })
    .lean();

  if (config) {
    res
      .status(200)
      .json(new ApiResponse(true, 'Dynamic custom order configuration fetched', config));
    return;
  }

  // Fallback to V1
  const v1Config = await WebsiteContent.findOne({ key: 'customOrderConfig' });
  if (v1Config) {
    res
      .status(200)
      .json(new ApiResponse(true, 'Legacy custom order configuration fetched', v1Config.content));
    return;
  }

  res
    .status(200)
    .json(new ApiResponse(true, 'Default custom order configuration fetched', DEFAULT_CONFIG));
});

export const adminGetCustomOrderConfig = asyncHandler(async (req: any, res: Response) => {
  // Requires authentication. Finds the latest config (draft or published)
  const config = await CustomOrderConfig.findOne().sort({ version: -1 }).lean();

  if (config) {
    res.status(200).json(new ApiResponse(true, 'Admin config fetched', config));
    return;
  }

  res.status(200).json(new ApiResponse(true, 'No config found', null));
});

export const adminSaveCustomOrderConfigDraft = asyncHandler(async (req: any, res: Response) => {
  const { content } = req.body;
  if (!content || !Array.isArray(content.types)) {
    res.status(400).json(new ApiResponse(false, 'Invalid config payload'));
    return;
  }

  const lastConfig = await CustomOrderConfig.findOne().sort({ version: -1 });

  let draftConfig;
  if (lastConfig && lastConfig.status === 'draft') {
    // Update existing draft
    lastConfig.types = content.types;
    lastConfig.updatedAt = new Date();
    await lastConfig.save();
    draftConfig = lastConfig;
  } else {
    // Create new draft version
    const nextVersion = lastConfig ? lastConfig.version + 1 : 1;
    draftConfig = await CustomOrderConfig.create({
      version: nextVersion,
      status: 'draft',
      types: content.types,
      isActive: false, // Drafts are never active storefronts
      createdBy: req.user._id,
    });
  }

  res.status(200).json(new ApiResponse(true, 'Draft saved successfully', draftConfig));
});

export const adminUpdateCustomOrderConfig = asyncHandler(async (req: any, res: Response) => {
  const { content } = req.body;

  // Save legacy V1 config for backwards compatibility
  await WebsiteContent.findOneAndUpdate(
    { key: 'customOrderConfig' },
    {
      content,
      lastUpdatedBy: req.user._id,
    },
    { upsert: true },
  );

  if (content && Array.isArray(content.types)) {
    const lastConfig = await CustomOrderConfig.findOne().sort({ version: -1 });
    let publishedConfig;

    if (lastConfig && lastConfig.status === 'draft') {
      // Publish the current draft
      lastConfig.types = content.types;
      lastConfig.status = 'published';
      lastConfig.isActive = true;
      await lastConfig.save();
      publishedConfig = lastConfig;
    } else {
      // Create new published version
      const nextVersion = lastConfig ? lastConfig.version + 1 : 1;
      publishedConfig = await CustomOrderConfig.create({
        version: nextVersion,
        status: 'published',
        types: content.types,
        isActive: true,
        createdBy: req.user._id,
      });
    }

    // Deactivate all others
    await CustomOrderConfig.updateMany(
      { _id: { $ne: publishedConfig._id }, isActive: true },
      { $set: { isActive: false } },
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          true,
          'Custom order configuration V2 published successfully',
          publishedConfig,
        ),
      );
    return;
  }

  res
    .status(200)
    .json(
      new ApiResponse(true, 'Legacy custom order configuration published successfully', content),
    );
});
