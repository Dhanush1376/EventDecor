import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCheckoutTotals } from './useCheckoutTotals';
import { persistentStorage } from '../../utils/storage/persistentStorage';
import { orderService, couponService } from '../../services/domainServices';

vi.mock('../../utils/storage/persistentStorage', () => ({
  persistentStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

vi.mock('../../services/domainServices', () => ({
  orderService: {
    validateTotals: vi.fn(),
  },
  couponService: {
    getAll: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useCheckoutTotals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistentStorage.getItem.mockImplementation((key, options) => options?.fallback);
    couponService.getAll.mockResolvedValue({ success: true, data: [] });
    orderService.validateTotals.mockResolvedValue({
      success: true,
      data: { subtotal: 100, discount: 0, shippingFee: 0, platformFee: 0, total: 100 },
    });
  });

  const defaultProps = {
    isAuthenticated: true,
    activeItems: [{ id: 'p1', quantity: 2 }],
    paymentOption: 'online',
    location: {},
    claimedCoupon: '',
    setClaimedCoupon: vi.fn(),
  };

  it('initializes with default values from storage', () => {
    const { result } = renderHook(() => useCheckoutTotals(defaultProps));
    expect(result.current.couponInput).toBe('');
    expect(result.current.appliedCoupon).toBe('');
    expect(result.current.useWallet).toBe(false);
  });

  it('fetches backend totals when appliedCoupon changes', async () => {
    const { result } = renderHook(() => useCheckoutTotals(defaultProps));

    await act(async () => {
      // simulate initial fetch resolution
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(orderService.validateTotals).toHaveBeenCalled();
    expect(result.current.backendTotals.total).toBe(100);
  });

  it('handles apply coupon correctly', async () => {
    const { result } = renderHook(() => useCheckoutTotals(defaultProps));

    act(() => {
      result.current.setCouponInput('SAVE20');
    });

    await act(async () => {
      result.current.handleApplyCoupon();
    });

    expect(orderService.validateTotals).toHaveBeenCalledWith(
      expect.objectContaining({
        couponCode: 'SAVE20',
      }),
    );
  });

  it('handles remove coupon correctly', async () => {
    const { result } = renderHook(() =>
      useCheckoutTotals({
        ...defaultProps,
        claimedCoupon: 'SAVE20',
      }),
    );

    await act(async () => {
      result.current.handleRemoveCoupon();
    });

    expect(result.current.appliedCoupon).toBe('');
    expect(result.current.couponInput).toBe('');
    expect(orderService.validateTotals).toHaveBeenCalledWith(
      expect.objectContaining({
        couponCode: undefined,
      }),
    );
  });
});
