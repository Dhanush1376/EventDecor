import { Request, Response } from 'express';
import Inquiry from '../models/Inquiry';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import logger from '../config/logger';

import { sendDirectEmail } from '../services/notificationService';

export const submitInquiry = asyncHandler(async (req: Request, res: Response) => {
  const inquiry = await Inquiry.create(req.body);
  
  // 1. Notify User
  if (inquiry.email) {
    sendDirectEmail({
      email: inquiry.email,
      subject: 'We Received Your Vision ✦ Siri Arts & Crafts',
      templateName: 'Inquiry Submitted',
      templateData: {
        name: inquiry.name,
        subject: inquiry.subject || 'Custom Decor Services',
      },
      type: 'engagement',
      action: 'inquiry_submitted'
    });
  }

  // 2. Notify Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'Sirisha.atmakuri@gmail.com';
  sendDirectEmail({
    email: adminEmail,
    subject: `New Inquiry Received: ${inquiry.subject || 'Siri Arts'}`,
    templateName: 'Admin Alert',
    templateData: {
      actionType: 'New Inquiry Submitted',
      timestamp: new Date().toLocaleString(),
      details: `Name: ${inquiry.name}\nEmail: ${inquiry.email}\nMessage: ${inquiry.message}`
    },
    type: 'system',
    action: 'admin_inquiry_alert'
  });

  // 3. Real-time Admin Notification
  try {
    const { createAdminNotification } = require('./adminNotificationController');
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
    Inquiry.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Inquiry.countDocuments()
  ]);

  res.status(200).json(new ApiResponse(true, 'Inquiries fetched successfully', {
    items: inquiries,
    page,
    totalPages: Math.ceil(total / limit),
    total
  }));
});

export const updateInquiryStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const inquiry = await Inquiry.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!inquiry) {
    res.status(404).json(new ApiResponse(false, 'Inquiry not found'));
    return;
  }

  res.status(200).json(new ApiResponse(true, 'Inquiry updated', inquiry));
});
