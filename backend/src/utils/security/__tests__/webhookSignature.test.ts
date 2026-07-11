import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyRazorpayWebhookSignature } from '../webhookSignature';

const SECRET = 'test_webhook_secret_at_least_32_chars_long';

const sign = (body: Buffer, secret: string = SECRET): string =>
  crypto.createHmac('sha256', secret).update(body).digest('hex');

describe('verifyRazorpayWebhookSignature', () => {
  const body = Buffer.from(
    JSON.stringify({ event: 'payment.captured', payload: { payment: { id: 'pay_123' } } }),
  );

  it('accepts a valid signature', () => {
    expect(verifyRazorpayWebhookSignature(sign(body), body, SECRET)).toBe(true);
  });

  it('rejects a signature computed with a different secret', () => {
    expect(verifyRazorpayWebhookSignature(sign(body, 'wrong_secret'), body, SECRET)).toBe(false);
  });

  it('rejects when the body was tampered with after signing', () => {
    const signature = sign(body);
    const tampered = Buffer.from(body.toString('utf8').replace('pay_123', 'pay_999'));
    expect(verifyRazorpayWebhookSignature(signature, tampered, SECRET)).toBe(false);
  });

  it('rejects an empty signature', () => {
    expect(verifyRazorpayWebhookSignature('', body, SECRET)).toBe(false);
  });

  it('rejects garbage signatures of the wrong length without throwing', () => {
    expect(verifyRazorpayWebhookSignature('deadbeef', body, SECRET)).toBe(false);
    expect(verifyRazorpayWebhookSignature('x'.repeat(64), body, SECRET)).toBe(false);
  });

  it('rejects when the secret is missing', () => {
    expect(verifyRazorpayWebhookSignature(sign(body), body, '')).toBe(false);
  });

  it('rejects an empty body', () => {
    expect(verifyRazorpayWebhookSignature(sign(body), Buffer.alloc(0), SECRET)).toBe(false);
  });
});
