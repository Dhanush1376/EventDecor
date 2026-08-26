import { Request, Response } from 'express';
import Inquiry from '../../models/Inquiry';
import asyncHandler from '../../utils/asyncHandler';
import ApiResponse from '../../utils/ApiResponse';
import logger from '../../config/logger';

import { TransactionalEmailService } from '../../services/TransactionalEmailService';

export const submitInquiry = asyncHandler(async (req: Request, res: Response) => {
  logger.info(`[EMAIL TRACE][INQUIRY][01] controller reached`);
  const inquiry = await Inquiry.create(req.body);
  logger.info(`[EMAIL TRACE][INQUIRY][02] inquiry persisted id=${inquiry._id}`);

  // Send reliable transactional emails (customer acknowledgment + all admins alert)
  // Trigger Notification Asynchronously
  logger.info(
    `[EMAIL TRACE][INQUIRY][03] calling TransactionalEmailService eventId=${inquiry._id}`,
  );
  TransactionalEmailService.sendInquiryEmails(inquiry, inquiry._id.toString()).catch((err) =>
    logger.error('Failed to dispatch inquiry notification:', err),
  );

  // 3. Real-time Admin Notification
  try {
    const { createAdminNotification } = require('../../services/notificationService');
    createAdminNotification({
      title: 'New Inquiry Received',
      message: `${inquiry.name || 'Someone'} submitted a new inquiry: "${(inquiry.message || '').substring(0, 80)}..."`,
      type: 'inquiry',
      actionLink: '/admin/inquiries',
    }).catch((err: any) => {
      logger.error('Failed to create admin notification for inquiry (async):', err);
    });
  } catch (notifErr) {
    logger.error('Failed to create admin notification for inquiry:', notifErr);
  }

  res.status(201).json(new ApiResponse(true, 'Inquiry submitted successfully', inquiry));
});

export const getInquiries = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const [inquiries, total] = await Promise.all([
    Inquiry.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Inquiry.countDocuments(),
  ]);

  res.status(200).json(
    new ApiResponse(true, 'Inquiries fetched successfully', {
      items: inquiries,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    }),
  );
});

export const updateInquiryStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const inquiry = await Inquiry.findByIdAndUpdate(
    req.params.id,
    { status },
    { returnDocument: 'after', runValidators: true },
  );

  if (!inquiry) {
    res.status(404).json(new ApiResponse(false, 'Inquiry not found'));
    return;
  }

  res.status(200).json(new ApiResponse(true, 'Inquiry updated', inquiry));
});
