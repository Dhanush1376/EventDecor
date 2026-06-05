import { PaymentRefundService } from '../services/PaymentRefundService';
import RefundRecord from '../models/RefundRecord';
import { RazorpayGateway } from '../utils/RazorpayGateway';
import { refundQueue } from '../jobs/queues';

jest.mock('../models/RefundRecord');
jest.mock('../utils/RazorpayGateway');
jest.mock('../jobs/queues', () => ({
  refundQueue: { add: jest.fn() },
  isQueuesReady: jest.fn().mockReturnValue(true),
}));

describe('PaymentRefundService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initiates async refund properly', async () => {
    const mockRecord = { _id: 'refund_123' };
    (RefundRecord.create as jest.Mock).mockResolvedValue([mockRecord]);

    await PaymentRefundService.initiateAsyncRefund({
      amount: 500,
      originalTransactionId: 'txn_123',
      entityType: 'Order',
      entityId: 'order_123',
    });

    expect(RefundRecord.create).toHaveBeenCalled();
    expect(refundQueue.add).toHaveBeenCalledWith('processRefund', {
      refundRecordId: mockRecord._id,
    });
  });

  it('processes refund atomically using findOneAndUpdate', async () => {
    const mockRecord = {
      _id: 'refund_123',
      amount: 500,
      originalTransactionId: 'txn_123',
      entityType: 'Order',
      entityId: 'order_123',
    };

    // Mock atomic claim success
    (RefundRecord.findOneAndUpdate as jest.Mock).mockResolvedValue(mockRecord);
    // Mock polling check success
    (RazorpayGateway.getPaymentRefunds as jest.Mock).mockResolvedValue({ items: [] });
    // Mock razorpay gateway success
    (RazorpayGateway.initiateRefund as jest.Mock).mockResolvedValue({ id: 'rzp_ref_123' });

    await PaymentRefundService.processRefundAsyncCore('refund_123');

    expect(RefundRecord.findOneAndUpdate).toHaveBeenCalled();
    expect(RazorpayGateway.initiateRefund).toHaveBeenCalled();
    expect(RefundRecord.updateOne).toHaveBeenCalledWith(
      { _id: mockRecord._id },
      { $set: { status: 'completed', razorpayRefundId: 'rzp_ref_123' } },
    );
  });

  it('skips processing if refund cannot be claimed (race condition prevention)', async () => {
    // Mock atomic claim failure
    (RefundRecord.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    // Mock findById showing it is already processing
    (RefundRecord.findById as jest.Mock).mockResolvedValue({ status: 'processing' });

    await PaymentRefundService.processRefundAsyncCore('refund_123');

    expect(RazorpayGateway.initiateRefund).not.toHaveBeenCalled();
  });
});
