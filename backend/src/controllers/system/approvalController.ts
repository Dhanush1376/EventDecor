import { Request, Response } from 'express';
import ApprovalRequest from '../../domains/system/models/ApprovalRequest';
import { ApprovalExecutor } from '../../domains/system/services/ApprovalExecutor';
import logger from '../../config/logger';

export const getPendingApprovals = async (req: Request, res: Response) => {
  try {
    const approvals = await ApprovalRequest.find({ status: 'Pending' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: approvals });
  } catch (error: any) {
    logger.error('Error fetching approvals:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getApprovalStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [approvedToday, rejectedToday] = await Promise.all([
      ApprovalRequest.countDocuments({ status: 'Approved', updatedAt: { $gte: today } }),
      ApprovalRequest.countDocuments({ status: 'Rejected', updatedAt: { $gte: today } }),
    ]);

    res.status(200).json({
      success: true,
      data: { approvedToday, rejectedToday },
    });
  } catch (error: any) {
    logger.error('Error fetching approval stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveRequest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const actorId = (req as any).user?.id || 'system';

    const approval = await ApprovalExecutor.executeConsequence(id, actorId);

    res.status(200).json({ success: true, data: approval });
  } catch (error: any) {
    logger.error('Error approving request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const approval = await ApprovalRequest.findById(id);

    if (!approval) {
      return res.status(404).json({ success: false, message: 'Approval request not found' });
    }

    approval.status = 'Rejected';
    await approval.save();

    res.status(200).json({ success: true, data: approval });
  } catch (error: any) {
    logger.error('Error rejecting request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
