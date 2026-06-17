import { AdminRefundApprovalService } from '../services/AdminRefundApprovalService';
import RefundRecord from '../models/RefundRecord';
import AdminAuditLog from '../models/AdminAuditLog';
import { PaymentRefundService } from '../services/PaymentRefundService';
import { createAdminNotification } from '../services/notificationService';

jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockResolvedValue({ name: 'Admin', role: 'super_admin' }),
  },
}));
jest.mock('../models/RefundRecord');
jest.mock('../models/AdminAuditLog');
jest.mock('../services/PaymentRefundService');
jest.mock('../services/notificationService', () => ({
  createAdminNotification: jest.fn(),
}));
jest.mock('../jobs/queues', () => ({
  isQueuesReady: jest.fn().mockReturnValue(true),
  refundQueue: { add: jest.fn() },
}));

describe('AdminRefundApprovalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateRefundRequest', () => {
    it('queues refund directly if amount is under threshold', async () => {
      const refundParams: any = {
        amount: 1000,
        entityType: 'Order',
        entityId: 'ord1',
        originalTransactionId: 'tx1',
      };

      const result = await AdminRefundApprovalService.evaluateRefundRequest(refundParams, 'user1');

      expect(result.status).toBe('queued_for_processing');
      expect(PaymentRefundService.initiateAsyncRefund).toHaveBeenCalledWith(refundParams);
      expect(RefundRecord.create).not.toHaveBeenCalled();
    });

    it('creates pending_approval record and notifies admins if amount is >= threshold', async () => {
      const refundParams: any = {
        amount: 5000,
        entityType: 'Order',
        entityId: 'ord1',
        originalTransactionId: 'tx1',
      };
      (RefundRecord.create as jest.Mock).mockResolvedValue({ _id: 'refund1' });

      const result = await AdminRefundApprovalService.evaluateRefundRequest(refundParams, 'user1');

      expect(result.status).toBe('requires_approval');
      expect(result.refundId).toBe('refund1');
      expect(RefundRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending_approval' }),
      );
      expect(createAdminNotification).toHaveBeenCalled();
      expect(PaymentRefundService.initiateAsyncRefund).not.toHaveBeenCalled();
    });
  });

  describe('approveRefund', () => {
    it('throws error if refund not found', async () => {
      (RefundRecord.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        AdminRefundApprovalService.approveRefund('refund1', '507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Refund record not found');
    });

    it('throws error if refund not in pending_approval state', async () => {
      (RefundRecord.findById as jest.Mock).mockResolvedValue({ status: 'pending' });
      await expect(
        AdminRefundApprovalService.approveRefund('refund1', '507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Refund cannot be approved');
    });

    it('approves refund, adds to queue, and creates audit log', async () => {
      const mockRefund = { _id: 'refund1', status: 'pending_approval', save: jest.fn() };
      (RefundRecord.findById as jest.Mock).mockResolvedValue(mockRefund);

      const { refundQueue } = require('../jobs/queues');

      await AdminRefundApprovalService.approveRefund(
        'refund1',
        '507f1f77bcf86cd799439011',
        'Looks good',
      );

      expect(mockRefund.status).toBe('pending');
      expect(mockRefund.save).toHaveBeenCalled();
      expect(refundQueue.add).toHaveBeenCalledWith('processRefund', { refundRecordId: 'refund1' });
      expect(AdminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'APPROVE', entityId: 'refund1' }),
      );
    });
  });

  describe('rejectRefund', () => {
    it('rejects refund, marks as failed, and creates audit log', async () => {
      const mockRefund: any = { _id: 'refund1', status: 'pending_approval', save: jest.fn() };
      (RefundRecord.findById as jest.Mock).mockResolvedValue(mockRefund);

      await AdminRefundApprovalService.rejectRefund(
        'refund1',
        '507f1f77bcf86cd799439011',
        'Fraud suspected',
      );

      expect(mockRefund.status).toBe('failed');
      expect(mockRefund.errorDetails).toContain('Fraud suspected');
      expect(mockRefund.save).toHaveBeenCalled();
      expect(AdminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REJECT', entityId: 'refund1' }),
      );
    });
  });
});
