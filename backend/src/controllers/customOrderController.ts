import { Request, Response } from 'express';
import CustomOrder from '../models/CustomOrder';
import WebsiteContent from '../models/WebsiteContent';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import { CustomOrderMailService } from '../services/customOrderMailService';
import logger from '../config/logger';

// DEFAULT CONFIG OPTIONS
const DEFAULT_CONFIG = {
  occasions: [
    { id: 'wedding', label: 'Wedding / Vivaham', enabled: true },
    { id: 'haldi', label: 'Haldi & Mehndi Ceremony', enabled: true },
    { id: 'reception', label: 'Reception Style Gala', enabled: true },
    { id: 'housewarming', label: 'Housewarming / Gruhapravesam', enabled: true },
    { id: 'baby_shower', label: 'Baby Shower / Seemantham', enabled: true },
    { id: 'corporate', label: 'Corporate & Banquet Decor', enabled: true },
    { id: 'other', label: 'Custom Festive Gathering', enabled: true }
  ],
  productTypes: [
    { id: 'mandapam', label: 'Full Mandapam Setup', enabled: true },
    { id: 'backdrop', label: 'Floral Backdrop Curations', enabled: true },
    { id: 'lounge', label: 'Luxury Reception Lounge', enabled: true },
    { id: 'table_scapes', label: 'Artisanal Table Centerpieces', enabled: true },
    { id: 'entrance', label: 'Grand Archways & Entrances', enabled: true },
    { id: 'brass_props', label: 'Handcrafted Brass Installations', enabled: true },
    { id: 'other', label: 'Bespoke Custom Artifacts', enabled: true }
  ],
  themes: [
    { id: 'traditional', label: 'Royal South Indian Heritage', enabled: true },
    { id: 'marigold_blast', label: 'Haldi Vibrant Yellows & Golds', enabled: true },
    { id: 'modern_gold', label: 'Contemporary Glassmorphism & Gold', enabled: true },
    { id: 'pastel_palace', label: 'Soft Pastel Florals & Ivory', enabled: true },
    { id: 'minimalist', label: 'Minimalist Wooden Craftsmanship', enabled: true }
  ],
  budgetRanges: [
    { id: 'low', label: '₹10,000 - ₹50,000', enabled: true },
    { id: 'medium', label: '₹50,000 - ₹1,500,000', enabled: true },
    { id: 'high', label: '₹1,500,000 - ₹5,000,000', enabled: true },
    { id: 'ultra', label: '₹5,000,000+', enabled: true }
  ],
  bookingTypes: [
    { id: 'video', label: 'Premium Video Consultation', enabled: true },
    { id: 'call', label: 'Direct Audio Conference', enabled: true },
    { id: 'in_person', label: 'In-Studio Creative Meeting', enabled: true }
  ]
};

// 1. Submit Custom Order (Customer)
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
    customerPhone
  } = req.body;

  const order = await CustomOrder.create({
    customerEmail: req.user?.email || req.body.customerEmail,
    customerName: req.user?.name || req.body.customerName,
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
    messages: [
      {
        sender: 'admin',
        senderName: 'Siri Arts Studio',
        text: 'Welcome to your custom design workspace! Our design team is currently reviewing your blueprint and inspiration images.',
        createdAt: new Date()
      }
    ]
  });

  // Trigger luxury emails asynchronously
  CustomOrderMailService.sendSubmissionEmails(order).catch(err => logger.error("Custom order submission email error:", err));

  res.status(201).json(new ApiResponse(true, 'Custom order request lodged successfully', order));
});

// 2. Get My Custom Orders (Customer)
export const getMyCustomOrders = asyncHandler(async (req: any, res: Response) => {
  const email = req.user?.email;
  const orders = await CustomOrder.find({ customerEmail: email }).sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(true, 'My custom orders synced', orders));
});

// 3. Get Single Custom Order (Customer or Admin)
export const getSingleCustomOrder = asyncHandler(async (req: any, res: Response) => {
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order details not found'));
    return;
  }

  // Ensure security boundaries
  if (req.user.role !== 'admin' && order.customerEmail !== req.user.email) {
    res.status(403).json(new ApiResponse(false, 'Unauthorized view access restricted'));
    return;
  }

  res.status(200).json(new ApiResponse(true, 'Custom order fetched', order));
});

// 4. Admin Search & Pipeline (Admin Only)
export const adminGetCustomOrders = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 15;
  const skip = (page - 1) * limit;

  const filterQuery: any = {};

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

  // Text Search matches customer name, email, occasion, or productType
  if (req.query.search) {
    const searchString = String(req.query.search).toLowerCase();
    filterQuery.$or = [
      { customerName: { $regex: searchString, $options: 'i' } },
      { customerEmail: { $regex: searchString, $options: 'i' } },
      { occasion: { $regex: searchString, $options: 'i' } },
      { productType: { $regex: searchString, $options: 'i' } },
      { city: { $regex: searchString, $options: 'i' } }
    ];
  }

  const [orders, total] = await Promise.all([
    CustomOrder.find(filterQuery).sort({ createdAt: -1 }).skip(skip).limit(limit),
    CustomOrder.countDocuments(filterQuery)
  ]);

  res.status(200).json(new ApiResponse(true, 'Custom orders catalog matched', {
    items: orders,
    page,
    totalPages: Math.ceil(total / limit),
    total
  }));
});

// 5. Admin Update Status
export const adminUpdateStatus = asyncHandler(async (req: any, res: Response) => {
  const { status } = req.body;
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  const prevStatus = order.status;
  order.status = status;

  // Add automated message detailing timeline shift
  order.messages.push({
    sender: 'admin',
    senderName: 'System Logger',
    text: `Workspace status transition: Changed from "${prevStatus}" to "${status}".`,
    createdAt: new Date()
  });

  await order.save();
  res.status(200).json(new ApiResponse(true, 'Status updated successfully', order));
});

// 6. Admin Update Priority
export const adminUpdatePriority = asyncHandler(async (req: Request, res: Response) => {
  const { priority } = req.body;
  const order = await CustomOrder.findByIdAndUpdate(
    req.params.id,
    { priority },
    { new: true, runValidators: true }
  );

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  res.status(200).json(new ApiResponse(true, 'Priority status elevated', order));
});

// 7. Admin Update Notes
export const adminUpdateNotes = asyncHandler(async (req: Request, res: Response) => {
  const { adminNotes } = req.body;
  const order = await CustomOrder.findByIdAndUpdate(
    req.params.id,
    { adminNotes },
    { new: true }
  );

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  res.status(200).json(new ApiResponse(true, 'Internal curators notes saved', order));
});

// 8. Admin Manage Quotation
export const adminUpdateQuotation = asyncHandler(async (req: any, res: Response) => {
  const { items, tax, shipping, notes, status: quoteStatus } = req.body;
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  const calculatedItems = items || [];
  const itemsSum = calculatedItems.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
  const taxVal = Number(tax) || 0;
  const shippingVal = Number(shipping) || 0;
  const grandTotal = itemsSum + taxVal + shippingVal;

  order.quotation = {
    items: calculatedItems,
    tax: taxVal,
    shipping: shippingVal,
    total: grandTotal,
    notes,
    status: quoteStatus || 'draft'
  };

  // If quote is sent, shift entire workspace status
  if (quoteStatus === 'sent') {
    order.status = 'Quote Sent';
    order.messages.push({
      sender: 'admin',
      senderName: 'System Logger',
      text: `An itemized studio estimate totaling ₹${grandTotal.toLocaleString('en-IN')} has been compiled and dispatched for review.`,
      createdAt: new Date()
    });

    // Trigger quotation email asynchronously
    CustomOrderMailService.sendQuotationEmail(order).catch(err => console.error("Quotation email error:", err));
  }

  await order.save();
  res.status(200).json(new ApiResponse(true, 'Quotation state synchronized', order));
});

// 9. Customer Respond to Quotation (Accept/Reject)
export const customerRespondQuotation = asyncHandler(async (req: any, res: Response) => {
  const { status } = req.body; // 'approved' or 'rejected'
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  if (order.customerEmail !== req.user.email) {
    res.status(403).json(new ApiResponse(false, 'Access restricted to order owner'));
    return;
  }

  order.quotation.status = status;

  if (status === 'approved') {
    order.status = 'Approved';
    order.messages.push({
      sender: 'customer',
      senderName: order.customerName,
      text: `I have APPROVED the provided estimate. Ready to proceed with scheduling and deposit transactions!`,
      createdAt: new Date()
    });
  } else {
    order.status = 'Reviewing';
    order.messages.push({
      sender: 'customer',
      senderName: order.customerName,
      text: `I have requested modifications on the quotation. Let's adjust the scope items.`,
      createdAt: new Date()
    });
  }

  await order.save();

  // Trigger response notification emails
  CustomOrderMailService.sendQuotationResponseEmail(order, status).catch(err => console.error("Quotation response email error:", err));

  res.status(200).json(new ApiResponse(true, 'Quotation response lodged', order));
});

// 10. Post Message Thread Note / Reference
export const postMessage = asyncHandler(async (req: any, res: Response) => {
  const { text, attachments } = req.body;
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  const isSenderAdmin = req.user.role === 'admin';

  if (!isSenderAdmin && order.customerEmail !== req.user.email) {
    res.status(403).json(new ApiResponse(false, 'Unauthorized message dispatch restricted'));
    return;
  }

  order.messages.push({
    sender: isSenderAdmin ? 'admin' : 'customer',
    senderName: isSenderAdmin ? 'Siri Design Team' : order.customerName,
    text,
    attachments: attachments || [],
    createdAt: new Date()
  });

  await order.save();

  // Trigger chat message email asynchronously
  CustomOrderMailService.sendChatMessageEmail(
    order,
    isSenderAdmin ? 'Siri Design Team' : order.customerName,
    isSenderAdmin ? 'admin' : 'customer',
    text
  ).catch(err => console.error("Chat message notification email error:", err));

  res.status(200).json(new ApiResponse(true, 'Message dispatched', order));
});

// 11. Admin Archive Request
export const adminArchiveOrder = asyncHandler(async (req: Request, res: Response) => {
  const { archived } = req.body;
  const order = await CustomOrder.findByIdAndUpdate(
    req.params.id,
    { archived: archived !== false },
    { new: true }
  );

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  res.status(200).json(new ApiResponse(true, archived ? 'Order archived' : 'Order restored', order));
});

// 12. Dynamic Form Configurations CMS
export const getCustomOrderConfig = asyncHandler(async (req: Request, res: Response) => {
  let config = await WebsiteContent.findOne({ key: 'customOrderConfig' });
  
  if (!config) {
    // Lazy seeding with beautiful presets
    config = await WebsiteContent.create({
      key: 'customOrderConfig',
      content: DEFAULT_CONFIG,
      status: 'published'
    });
  }

  res.status(200).json(new ApiResponse(true, 'Dynamic custom order configuration fetched', config.content));
});

export const adminUpdateCustomOrderConfig = asyncHandler(async (req: any, res: Response) => {
  const { content } = req.body;
  
  const config = await WebsiteContent.findOneAndUpdate(
    { key: 'customOrderConfig' },
    { 
      content,
      lastUpdatedBy: req.user._id 
    },
    { new: true, upsert: true }
  );

  res.status(200).json(new ApiResponse(true, 'Custom order dynamic configs updated', config.content));
});
