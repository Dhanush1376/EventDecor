import { Request, Response } from 'express';
import CustomOrder from '../../models/CustomOrder';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import { CustomOrderMailService } from '../../services/customOrderMailService';
import logger from '../../config/logger';
import { ADMIN_ROLES } from '../../config/adminConfig';
import User from '../../models/User';
import { createStatusHistoryEntry } from './customOrderHelpers';

// 15. Customer Respond to Quotation (Accept/Reject)
export const customerRespondQuotation = asyncHandler(async (req: Request, res: Response) => {
  const { status, reason } = req.body; // 'approved' or 'rejected'
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

  if (order.customerEmail !== (req as any).user.email) {
    res.status(403).json(new ApiResponse(false, 'Access restricted to order owner'));
    return;
  }

  const prevStatus = order.status;
  order.quotation.status = status;

  if (status === 'approved') {
    order.status = 'Checkout Ready';
    order.quotation.approvedAt = new Date();
    order.quotation.approvedBy = (req as any).user.email;
    order.statusHistory.push(
      createStatusHistoryEntry(
        prevStatus,
        'Checkout Ready',
        (req as any).user.email,
        'Customer approved quotation',
      ) as any,
    );

    // Enterprise Feature: Generate conversation summary and custom product snapshot
    const conversationSummary = `Customer approved quotation. Total messages exchanged: ${order.messages.length}. Key requirements: ${order.customRequirements || 'Standard customization.'}`;

    order.customProduct = {
      title: `Custom ${order.occasion || order.productType || 'Event'} Package`,
      finalPrice: order.quotation.total || 0,
      badge: 'APPROVED_DESIGN',
      conversationSummary,
      summaryGeneratedAt: new Date(),
    };

    order.messages.push({
      sender: 'customer',
      senderName: order.customerName,
      text: `I have APPROVED the provided estimate. Ready to proceed with scheduling and deposit transactions!`,
      messageType: 'quotation',
      createdAt: new Date(),
    });

    order.messages.push({
      sender: 'system',
      senderName: 'System Logger',
      text: `Custom Product profile generated. Please proceed to checkout to secure your booking.`,
      messageType: 'system',
      createdAt: new Date(),
    });

    const itemsList = order.quotation.items
      .map((item: any) => `- ${item.description}: ₹${item.amount}`)
      .join('\n');
    order.orderSummary = `Quotation Approved for ${order.occasion || order.productType || 'Custom Order'}\n\nFinal Pricing:\n${itemsList}\nTax: ₹${order.quotation.tax || 0}\nShipping: ₹${order.quotation.shipping || 0}\nGrand Total: ₹${order.quotation.total || 0}`;

    const eventDateStr = order.eventDate
      ? new Date(order.eventDate).toLocaleDateString()
      : 'Not specified';
    order.orderNotes = `Event Date: ${eventDateStr}\nCity: ${order.city || 'Not specified'}\n\nRequirements:\n${order.customRequirements || 'Standard customization as discussed.'}`;
  } else {
    order.status = 'Reviewing';
    order.statusHistory.push(
      createStatusHistoryEntry(
        prevStatus,
        'Reviewing',
        (req as any).user.email,
        'Customer requested changes to quotation',
      ) as any,
    );
    order.messages.push({
      sender: 'customer',
      senderName: order.customerName,
      text: reason
        ? `I have requested modifications on the quotation. Reason: ${reason}`
        : `I have requested modifications on the quotation. Let's adjust the scope items.`,
      messageType: 'quotation',
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
export const postMessage = asyncHandler(async (req: Request, res: Response) => {
  const { text, attachments, source } = req.body;
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  const isAdminRole = ADMIN_ROLES.includes((req as any).user.role as any);
  let isSenderAdmin = false;

  if (isAdminRole) {
    if (source === 'admin_portal') {
      isSenderAdmin = true;
    } else {
      isSenderAdmin = false;
    }
  }

  if (!isSenderAdmin && order.customerEmail !== (req as any).user.email) {
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

  // SEC-06: Validate attachment URLs (whitelist only Cloudinary)
  const validAttachments = (attachments || []).filter((url: string) => {
    return url && typeof url === 'string' && url.includes('res.cloudinary.com');
  });

  let messageType: 'system' | 'human' | 'quotation' | 'status_change' | 'file_upload' = 'human';
  if (validAttachments.length > 0) {
    messageType = 'file_upload';
  }

  order.messages.push({
    sender: isSenderAdmin ? 'admin' : 'customer',
    senderName: isSenderAdmin ? 'Siri Design Team' : order.customerName,
    text,
    attachments: validAttachments,
    messageType,
    createdAt: new Date(),
  });

  await order.save();

  // Trigger chat message email asynchronously
  CustomOrderMailService.sendChatMessageEmail(
    order,
    isSenderAdmin ? 'Siri Design Team' : order.customerName,
    isSenderAdmin ? 'admin' : 'customer',
    text,
    (order.messages[order.messages.length - 1] as any)._id.toString(),
  ).catch((err) => logger.error('Chat message notification email error:', err));

  // Emit socket event
  try {
    const { emitUserEvent, emitAdminNotification } = require('../../socket');
    if (isSenderAdmin) {
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
  } catch {}

  res.status(200).json(new ApiResponse(true, 'Message dispatched', order));
});

// 17. Get Status/Version History
export const getOrderHistory = asyncHandler(async (req: Request, res: Response) => {
  const order = await CustomOrder.findById(req.params.id)
    .select('statusHistory versions orderId customerEmail')
    .lean();

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  // BUG-02: Auth check
  const isSenderAdmin = ADMIN_ROLES.includes((req as any).user.role as any);
  if (!isSenderAdmin && order.customerEmail !== (req as any).user.email) {
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
