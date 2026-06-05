import { PaymentWebhookService } from '../services/PaymentWebhookService';
import PaymentWebhookEvent from '../models/PaymentWebhookEvent';

jest.mock('../models/PaymentWebhookEvent');

describe('PaymentWebhookService - Idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects duplicate webhook events cleanly', async () => {
    // Mock create to throw a duplicate key error (code 11000)
    (PaymentWebhookEvent.create as jest.Mock).mockRejectedValue({ code: 11000 });

    const response = await PaymentWebhookService.processRazorpayWebhook(
      'order.paid',
      {},
      'sig',
      'evt_duplicate',
    );

    expect(response.status).toBe(200);
    expect(response.message).toContain('Duplicate event skipped');
  });

  it('detects already processing events during core execution', async () => {
    // Mock findOneAndUpdate to return null (could not claim)
    (PaymentWebhookEvent.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    // Mock findOne to return a processing event
    (PaymentWebhookEvent.findOne as jest.Mock).mockResolvedValue({ status: 'processing' });

    const response = await PaymentWebhookService.processRazorpayWebhookCore(
      'order.paid',
      {},
      'sig',
      'evt_processing',
    );

    expect(response.status).toBe(409);
    expect(response.message).toContain('Webhook currently being processed');
  });

  it('detects already processed events during core execution', async () => {
    // Mock findOneAndUpdate to return null (could not claim)
    (PaymentWebhookEvent.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    // Mock findOne to return a processed event
    (PaymentWebhookEvent.findOne as jest.Mock).mockResolvedValue({ status: 'processed' });

    const response = await PaymentWebhookService.processRazorpayWebhookCore(
      'order.paid',
      {},
      'sig',
      'evt_processed',
    );

    expect(response.status).toBe(200);
    expect(response.message).toContain('Webhook already processed');
  });
});
