import './setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { PaymentWebhookService } from '../../src/services/PaymentWebhookService';
import { UnifiedWebhookRouter } from '../../src/services/payments/UnifiedWebhookRouter';
import PaymentWebhookEvent from '../../src/models/PaymentWebhookEvent';

const makeBody = (paymentId = 'pay_ABC') => ({
  event: 'payment.captured',
  payload: { payment: { entity: { id: paymentId, order_id: 'order_ABC' } } },
});

describe('PaymentWebhookService ingestion idempotency (integration)', () => {
  beforeEach(() => {
    // Queue is not initialized in tests, so ingestion falls back to the
    // synchronous router. Stub it so we test dedup, not downstream processing.
    vi.spyOn(UnifiedWebhookRouter, 'routeWebhookEvent').mockResolvedValue({
      status: 200,
      message: 'processed',
    } as any);
  });
  afterEach(() => vi.restoreAllMocks());

  it('persists a webhook event on first receipt', async () => {
    const body = makeBody();
    const res = await PaymentWebhookService.processRazorpayWebhook(
      body.event,
      body,
      'sig',
      'evt_100',
    );

    expect(res.status).toBe(200);
    const stored = await PaymentWebhookEvent.find({ razorpayEventId: 'evt_100' });
    expect(stored).toHaveLength(1);
    expect(stored[0].eventType).toBe('payment.captured');
  });

  it('deduplicates a redelivered event with the same event id', async () => {
    const body = makeBody();

    const first = await PaymentWebhookService.processRazorpayWebhook(
      body.event,
      body,
      'sig',
      'evt_dup',
    );
    const second = await PaymentWebhookService.processRazorpayWebhook(
      body.event,
      body,
      'sig',
      'evt_dup',
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.message).toMatch(/duplicate/i);

    // Only ONE event row exists despite two deliveries (unique index enforced).
    expect(await PaymentWebhookEvent.countDocuments({ razorpayEventId: 'evt_dup' })).toBe(1);
  });

  it('does NOT re-run downstream processing for a duplicate delivery', async () => {
    const body = makeBody();
    await PaymentWebhookService.processRazorpayWebhook(body.event, body, 'sig', 'evt_once');
    await PaymentWebhookService.processRazorpayWebhook(body.event, body, 'sig', 'evt_once');

    // The synchronous router should have been invoked exactly once — the
    // duplicate is short-circuited before any downstream side effects.
    expect(UnifiedWebhookRouter.routeWebhookEvent).toHaveBeenCalledTimes(1);
  });

  it('treats distinct event ids as separate events', async () => {
    const body = makeBody();
    await PaymentWebhookService.processRazorpayWebhook(body.event, body, 'sig', 'evt_a');
    await PaymentWebhookService.processRazorpayWebhook(body.event, body, 'sig', 'evt_b');

    expect(await PaymentWebhookEvent.countDocuments({})).toBe(2);
    expect(UnifiedWebhookRouter.routeWebhookEvent).toHaveBeenCalledTimes(2);
  });
});
