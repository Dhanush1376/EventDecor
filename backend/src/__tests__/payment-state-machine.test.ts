import { PaymentStateMachine } from '../services/payments/PaymentStateMachine';
import ApiError from '../utils/ApiError';

jest.mock('@sentry/node', () => ({
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

describe('PaymentStateMachine', () => {
  it('allows valid transitions', () => {
    const order = { paymentStatus: 'pending', statusHistory: [] };
    PaymentStateMachine.transition(order, 'processing');
    expect(order.paymentStatus).toBe('processing');

    PaymentStateMachine.transition(order, 'captured');
    expect(order.paymentStatus).toBe('captured');
  });

  it('rejects invalid transitions', () => {
    const order = { _id: '123', paymentStatus: 'paid', statusHistory: [] };
    expect(() => PaymentStateMachine.transition(order, 'pending')).toThrow(ApiError);
  });

  it('is idempotent for the same state', () => {
    const order = { paymentStatus: 'paid', statusHistory: [] };
    PaymentStateMachine.transition(order, 'paid');
    expect(order.paymentStatus).toBe('paid');
  });

  it('allows valid dispute state transitions', () => {
    const order = { paymentStatus: 'paid', statusHistory: [] };
    PaymentStateMachine.transition(order, 'disputed');
    expect(order.paymentStatus).toBe('disputed');

    PaymentStateMachine.transition(order, 'dispute_open');
    expect(order.paymentStatus).toBe('dispute_open');

    PaymentStateMachine.transition(order, 'dispute_won');
    expect(order.paymentStatus).toBe('dispute_won');
  });

  it('tracks status history when notes are provided', () => {
    const order: any = { orderStatus: 'Pending', paymentStatus: 'pending', statusHistory: [] };
    PaymentStateMachine.transition(order, 'processing', 'Started processing');
    expect(order.statusHistory.length).toBe(1);
    expect(order.statusHistory[0].note).toContain('Started processing');
  });
});
