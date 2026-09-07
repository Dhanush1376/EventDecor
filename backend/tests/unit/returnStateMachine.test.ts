import { describe, it, expect } from 'vitest';
import { ReturnStateMachine } from '../../src/services/returns/ReturnStateMachine';

describe('ReturnStateMachine Transition Validation', () => {
  it('should permit valid transition from submitted to approved', () => {
    expect(ReturnStateMachine.validateTransition('submitted', 'approved')).toBe(true);
  });

  it('should permit valid transition from submitted to rejected', () => {
    expect(ReturnStateMachine.validateTransition('submitted', 'rejected')).toBe(true);
  });

  it('should permit valid transition from approved to return_picked_up', () => {
    expect(ReturnStateMachine.validateTransition('approved', 'return_picked_up')).toBe(true);
  });

  it('should permit valid transition from return_picked_up to return_received', () => {
    expect(ReturnStateMachine.validateTransition('return_picked_up', 'return_received')).toBe(true);
  });

  it('should permit valid transition from inspection_completed to refund_initiated', () => {
    expect(ReturnStateMachine.validateTransition('inspection_completed', 'refund_initiated')).toBe(
      true,
    );
  });

  it('should REJECT direct jump from submitted to completed', () => {
    expect(ReturnStateMachine.validateTransition('submitted', 'completed')).toBe(false);
  });

  it('should REJECT direct jump from return_picked_up to completed', () => {
    expect(ReturnStateMachine.validateTransition('return_picked_up', 'completed')).toBe(false);
  });

  it('should REJECT invalid unknown statuses', () => {
    expect(ReturnStateMachine.validateTransition('submitted', 'non_existent_state')).toBe(false);
    expect(ReturnStateMachine.validateTransition('completed', 'submitted')).toBe(false);
  });
});
