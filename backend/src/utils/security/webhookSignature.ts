import crypto from 'crypto';

/**
 * Verify a Razorpay webhook signature (HMAC-SHA256 over the raw request body).
 *
 * Uses a constant-time comparison to prevent timing attacks. Kept free of any
 * app-level imports so it can be unit-tested in isolation.
 */
export const verifyRazorpayWebhookSignature = (
  signature: string,
  rawBody: Buffer,
  webhookSecret: string,
): boolean => {
  if (!signature || !webhookSecret || !rawBody?.length) return false;
  const shasum = crypto.createHmac('sha256', webhookSecret);
  shasum.update(rawBody);
  const digest = shasum.digest('hex');
  const expected = Buffer.from(digest, 'utf8');
  const received = Buffer.from(signature, 'utf8');
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};
