import { Request, Response } from 'express';
import WhatsAppRole from '../../models/WhatsAppRole';
import WhatsAppApprovalRequest from '../../models/WhatsAppApprovalRequest';
import { WhatsAppApprovalService } from '../../domains/notifications/whatsapp/WhatsAppApprovalService';

export class WhatsAppRBACController {
  // --- ROLES ---
  static async getRoles(req: Request, res: Response): Promise<void> {
    try {
      const roles = await WhatsAppRole.find().sort({ createdAt: -1 });
      res.json({ success: true, data: roles });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async createRole(req: Request, res: Response): Promise<void> {
    try {
      const role = new WhatsAppRole(req.body);
      await role.save();
      res.status(201).json({ success: true, data: role });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const role = await WhatsAppRole.findById(req.params.id);
      if (role?.isSystemRole) {
        res.status(403).json({ success: false, error: 'Cannot modify system role' });
        return;
      }
      const updated = await WhatsAppRole.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // --- APPROVAL WORKFLOWS ---
  static async getApprovalRequests(req: Request, res: Response): Promise<void> {
    try {
      const requests = await WhatsAppApprovalRequest.find()
        .populate('requestedBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 });
      res.json({ success: true, data: requests });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async approveRequest(req: Request, res: Response): Promise<void> {
    try {
      const { comments } = req.body;
      const approvedReq = await WhatsAppApprovalService.approveRequest(
        req.params.id as string,
        (req.user as any)._id,
        comments,
      );

      // Since we approved it, we would theoretically execute the payload here.
      // For this demo, we'll return a special flag so the frontend can execute it with an override token.
      res.json({ success: true, message: 'Request approved successfully.', data: approvedReq });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async rejectRequest(req: Request, res: Response): Promise<void> {
    try {
      const { reason } = req.body;
      await WhatsAppApprovalService.rejectRequest(
        req.params.id as string,
        (req.user as any)._id,
        reason || 'No reason provided',
      );
      res.json({ success: true, message: 'Request rejected' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
