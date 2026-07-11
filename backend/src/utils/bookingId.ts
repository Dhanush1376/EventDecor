import crypto from 'crypto';
import EventJob from '../domains/event_operations/models/EventJob';

const MAX_ATTEMPTS = 8;

/**
 * Generates a collision-resistant booking ID (SR-BK-YYYY-XXXXXX).
 * Retries on duplicate-key conflicts instead of using a sequential counter.
 */
export async function generateUniqueBookingId(): Promise<string> {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const bookingId = `SR-BK-${year}-${suffix}`;
    const exists = await EventJob.exists({ bookingId });
    if (!exists) return bookingId;
  }

  const fallback = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `SR-BK-${year}-${fallback}`;
}
