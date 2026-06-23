import { Request, Response } from 'express';
import CustomOrder from '../../models/CustomOrder.js';
import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { CustomOrderMailService } from '../../services/customOrderMailService.js';
import logger from '../../config/logger.js';
import User from '../../models/User.js';
import { createStatusHistoryEntry, createVersionSnapshot } from './customOrderHelpers.js';

// 8. Admin Search & Pipeline (Admin Only)
export const adminGetCustomOrders = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 15;
  const skip = (page - 1) * limit;

  const filterQuery: Record<string, unknown> = { isDraft: { $ne: true } };

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
export const adminUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
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

  const versionSnapshot = createVersionSnapshot(
    order,
    'status',
    (req as any).user?.email || 'admin',
  );
  const historyEntry = createStatusHistoryEntry(
    prevStatus,
    status,
    (req as any).user?.email || 'admin',
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
    const { emitUserEvent } = await import('../../socket.js');
    // Find user by email to get userId for socket room
    const user = await User.findOne({ email: finalOrder.customerEmail });
    if (user) {
      emitUserEvent(user._id.toString(), 'customOrder:statusChange', {
        orderId: finalOrder.orderId,
        status: finalOrder.status,
        previousStatus: prevStatus,
      });
    }
  } catch {}

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
export const adminAddInternalNote = asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body;
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  order.internalNotes.push({
    author: (req as any).user._id?.toString() || (req as any).user.email,
    authorName: (req as any).user.name || 'Admin',
    text,
    createdAt: new Date(),
  });

  await order.save();
  res.status(200).json(new ApiResponse(true, 'Internal note added', order));
});

// 13. Admin Assign Staff
export const adminAssignStaff = asyncHandler(async (req: Request, res: Response) => {
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
      assignedBy: (req as any).user._id?.toString() || (req as any).user.email,
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
export const adminUpdateQuotation = asyncHandler(async (req: Request, res: Response) => {
  const { items, tax, shipping, notes, status: quoteStatus } = req.body;
  const order = await CustomOrder.findById(req.params.id);

  if (!order) {
    res.status(404).json(new ApiResponse(false, 'Custom order not found'));
    return;
  }

  // Create version snapshot before update
  order.versions.push(
    createVersionSnapshot(order, 'quotation', (req as any).user?.email || 'admin') as any,
  );

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
        (req as any).user?.email || 'admin',
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
      const { emitUserEvent } = await import('../../socket.js');
      const customer = await User.findOne({ email: order.customerEmail }).select('_id');
      if (customer) {
        emitUserEvent(customer._id.toString(), 'customOrder:quoteCreated', {
          orderId: order.orderId,
          total: grandTotal,
        });
      }
    } catch {}
  }

  await order.save();
  res.status(200).json(new ApiResponse(true, 'Quotation state synchronized', order));
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
