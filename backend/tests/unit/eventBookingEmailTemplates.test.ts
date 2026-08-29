import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  buildEventBookingInquiryEmail,
  buildEventBookingConfirmedEmail,
  buildEventBookingStatusUpdateEmail,
  buildEventBookingAdminEmail,
} from '../../src/utils/email/transactionalEmailTemplates';

// Mock config so tests don't fail due to missing env vars
vi.mock('../../src/config', () => ({
  default: {
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:5173',
    EMAIL: {
      FROM: 'test@example.com',
      REPLY_TO: 'test@example.com',
    },
  },
}));

describe('Event Booking Email Templates', () => {
  const mockUser = {
    _id: 'user_123',
    name: 'John Doe',
    email: 'john@example.com',
  };

  const mockBooking = {
    _id: 'mock_mongo_id',
    bookingId: 'SR-BK-2026-ABCDEF',
    title: 'Luxury Wedding Decor',
    status: 'inquiry',
    date: new Date('2026-10-15T00:00:00Z'),
    pricing: {
      rentalFee: 50000,
      setupCharges: 5000,
      travelExpenseTotal: 2000,
      totalPrice: 57000,
      depositAmount: 28500,
      pendingBalance: 28500,
    },
    guestCount: 500,
    venue: {
      name: 'Grand Palace',
      address: '123 Royal Ave',
      city: 'Hyderabad',
    },
    eventPackage: {
      title: 'Premium Package',
    },
  };

  it('buildEventBookingInquiryEmail includes Booking ID and status badge', () => {
    const { subject, html } = buildEventBookingInquiryEmail(mockBooking, mockUser);

    expect(subject).toContain('Booking Request Received');
    expect(subject).toContain('SR-BK-2026-ABCDEF');
    expect(html).toContain('SR-BK-2026-ABCDEF');
    expect(html).toContain('Luxury Wedding Decor');
    expect(html).toContain('Inquiry');
    expect(html).toContain('Grand Palace');

    // Check for absence of object artifacts
    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('null');
  });

  it('buildEventBookingConfirmedEmail includes payment summary and Booking ID', () => {
    const confirmedBooking = { ...mockBooking, status: 'confirmed' };
    const { subject, html } = buildEventBookingConfirmedEmail(confirmedBooking, mockUser);

    expect(subject).toContain('Your Event Booking Is Confirmed');
    expect(subject).toContain('SR-BK-2026-ABCDEF');
    expect(html).toContain('SR-BK-2026-ABCDEF');
    expect(html).toContain('Confirmed');

    // Check pricing
    expect(html).toContain('57,000'); // Total
    expect(html).toContain('28,500'); // Paid / Pending

    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('undefined');
  });

  it('buildEventBookingStatusUpdateEmail handles dynamic statuses correctly', () => {
    // 1. Team Assigned
    let res = buildEventBookingStatusUpdateEmail(
      mockBooking,
      mockUser,
      'confirmed',
      'team_assigned',
    );
    expect(res.subject).toContain('Team Assigned');
    expect(res.subject).toContain('SR-BK-2026-ABCDEF');
    expect(res.html).toContain('artisans have been assigned');
    expect(res.html).toContain('Team Assigned');

    // 2. Completed
    res = buildEventBookingStatusUpdateEmail(mockBooking, mockUser, 'execution', 'completed');
    expect(res.subject).toContain('Event Completed');
    expect(res.html).toContain('spectacular success');

    // 3. Failed
    res = buildEventBookingStatusUpdateEmail(mockBooking, mockUser, 'payment_pending', 'failed');
    expect(res.subject).toContain('Booking Failed');
    expect(res.html).toContain('contact support');
  });

  it('buildEventBookingAdminEmail includes customer details and Booking ID', () => {
    const { subject, html } = buildEventBookingAdminEmail(mockBooking, mockUser);

    expect(subject).toContain('[NEW BOOKING]');
    expect(subject).toContain('John Doe');
    expect(html).toContain('SR-BK-2026-ABCDEF');
    expect(html).toContain('John Doe');
  });

  it('gracefully handles missing optional fields', () => {
    const minimalBooking = { _id: 'mock_mongo_id' };
    const { html } = buildEventBookingInquiryEmail(minimalBooking, {});

    // Fallbacks
    expect(html).toContain('mock_mongo_id'); // ID fallback
    expect(html).toContain('Valued Guest'); // Name fallback
    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('NaN');
  });
});
