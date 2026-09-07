import { describe, it, expect } from 'vitest';
import { getCustomerReturnStage } from '../ReturnTimeline';

describe('getCustomerReturnStage Customer Normalization', () => {
  it('maps submitted to Stage 0 (submitted)', () => {
    const result = getCustomerReturnStage('submitted');
    expect(result.stage).toBe('submitted');
    expect(result.index).toBe(0);
  });

  it('maps operational courier/pickup states to Stage 1 (pickup)', () => {
    expect(getCustomerReturnStage('approved').stage).toBe('pickup');
    expect(getCustomerReturnStage('approved').index).toBe(1);

    expect(getCustomerReturnStage('return_courier_assigned').stage).toBe('pickup');
    expect(getCustomerReturnStage('return_picked_up').stage).toBe('pickup');
    expect(getCustomerReturnStage('return_in_transit').stage).toBe('pickup');
  });

  it('maps operational facility/warehouse inspection states to Stage 2 (received)', () => {
    expect(getCustomerReturnStage('return_received').stage).toBe('received');
    expect(getCustomerReturnStage('return_received').index).toBe(2);

    expect(getCustomerReturnStage('inspection_started').stage).toBe('received');
    expect(getCustomerReturnStage('inspection_completed').stage).toBe('received');
  });

  it('maps refund/settlement states to Stage 3 (completed)', () => {
    expect(getCustomerReturnStage('refund_initiated').stage).toBe('completed');
    expect(getCustomerReturnStage('refund_initiated').index).toBe(3);

    expect(getCustomerReturnStage('refund_completed').stage).toBe('completed');
    expect(getCustomerReturnStage('completed').stage).toBe('completed');
    expect(getCustomerReturnStage('delivered', 'exchange').stage).toBe('completed');
  });

  it('maps rejected and cancelled to terminal non-indexed stages', () => {
    expect(getCustomerReturnStage('rejected')).toEqual({ stage: 'rejected', index: -1 });
    expect(getCustomerReturnStage('cancelled')).toEqual({ stage: 'cancelled', index: -1 });
  });
});
