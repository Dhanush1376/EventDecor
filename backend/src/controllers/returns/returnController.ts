import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import ReturnRequest from '../../models/ReturnRequest';
import ExchangeRequest from '../../models/ExchangeRequest';
import '../../models/Product';
import ApiError from '../../utils/ApiError';
import ApiResponse from '../../utils/ApiResponse';
import { STAFF_ROLES } from '../../config/adminConfig';
import { WhatsAppReturnService } from '../../services/returns/WhatsAppReturnService';

/**
 * @desc    Items of the customer's order that can be returned or exchanged over WhatsApp
 * @route   GET /api/v1/returns/whatsapp/:orderId
 * @access  Private (order owner)
 */
export const getWhatsAppEligibility = asyncHandler(async (req: Request, res: Response) => {
  const { summary, customer, items, requestTypes, whatsappConfigured } =
    await WhatsAppReturnService.getEligibility(req.params.orderId as string, req.user!.id);
  res.status(200).json(
    new ApiResponse(true, 'Return eligibility fetched', {
      ...summary,
      customer,
      items,
      requestTypes,
      whatsappConfigured,
    }),
  );
});

/**
 * @desc    Build the pre-filled WhatsApp message for a return/exchange request.
 *          Nothing is stored: the request is made when the customer sends the message.
 * @route   POST /api/v1/returns/whatsapp/:orderId
 * @access  Private (order owner)
 */
export const buildWhatsAppRequest = asyncHandler(async (req: Request, res: Response) => {
  const result = await WhatsAppReturnService.buildRequest(
    req.params.orderId as string,
    req.user!.id,
    req.body,
  );
  res.status(200).json(new ApiResponse(true, 'WhatsApp message ready', result));
});

/**
 * @desc    Return requests created by the previous automated flow (read-only history)
 * @route   GET /api/v1/returns/my-returns
 * @access  Private
 */
export const getMyReturns = asyncHandler(async (req: Request, res: Response) => {
  const returns = await ReturnRequest.find({ userId: req.user!.id })
    .sort({ createdAt: -1, _id: -1 })
    .populate('orderId', 'orderStatus paymentStatus total trackingNumber')
    .populate('items.productId', 'title imageSrc')
    .lean();

  res.status(200).json({ success: true, data: { returns } });
});

/**
 * @desc    Legacy return/exchange records for one order (read-only history)
 * @route   GET /api/v1/returns/order/:orderId/summary
 * @access  Private (order owner or staff)
 */
export const getReturnForOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Unauthorized');
  const isStaff = (STAFF_ROLES as readonly string[]).includes(req.user.role);

  const query: any = { orderId: req.params.orderId };
  if (!isStaff) query.userId = req.user.id;

  const returns = await ReturnRequest.find(query)
    .populate('items.productId', 'title imageSrc')
    .lean();
  const exchanges = await ExchangeRequest.find({
    returnRequestId: { $in: returns.map((r) => r._id) },
  }).lean();

  res.status(200).json({ success: true, data: { returns, exchanges } });
});
