import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import { CheckoutProvider } from '../checkout/CheckoutProvider';
import { Checkout } from '../pages/Checkout';
import api from '../services/api';
import { CartStateContext, CartDispatchContext } from '../context/CartContext';

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  setAccessToken: vi.fn(),
  setAuthBootstrapActive: vi.fn(),
  refreshAccessToken: vi.fn(),
  hasSessionMarker: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockCartState = {
  items: [
    {
      _id: 'cart-item-1',
      product: {
        _id: 'prod-1',
        name: 'Test Product 1',
        price: 50,
        images: [{ url: 'test.jpg' }],
      },
      quantity: 2,
      price: 50,
      itemType: 'purchase',
      type: 'purchase',
    },
  ],
  purchaseCart: {
    items: [
      {
        _id: 'cart-item-1',
        product: {
          _id: 'prod-1',
          name: 'Test Product 1',
          price: 50,
          images: [{ url: 'test.jpg' }],
        },
        quantity: 2,
        price: 50,
        itemType: 'purchase',
        type: 'purchase',
      },
    ],
    summary: { subtotal: 100 },
  },
  rentalCart: [],
  cartCount: 1,
  purchaseCartCount: 1,
  rentalCartCount: 0,
  activeCartMode: 'purchase',
  subtotal: 100,
  totalMRP: 100,
  summary: {
    subtotal: 100,
    shippingFee: 0,
    platformFee: 0,
    discount: 0,
    total: 100,
  },
  isCartOpen: false,
  loading: false,
  claimedCoupon: null,
  appliedCoupon: null,
  isInCart: vi.fn(),
};

const mockCartDispatch = {
  refreshCart: vi.fn(),
  addItem: vi.fn(),
  attemptAddToCart: vi.fn(),
  removeItem: vi.fn(),
  updateQuantity: vi.fn(),
  clearCart: vi.fn(),
  setIsCartOpen: vi.fn(),
  setActiveCartMode: vi.fn(),
  setClaimedCoupon: vi.fn(),
  setAppliedCoupon: vi.fn(),
};

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
};

const renderWithProviders = (component) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/checkout']}>
        <AuthContext.Provider
          value={{ isAuthenticated: true, user: mockUser, isAuthInitialized: true }}
        >
          <CartStateContext.Provider value={mockCartState}>
            <CartDispatchContext.Provider value={mockCartDispatch}>
              <CheckoutProvider>
                <Routes>
                  <Route path="/checkout" element={component} />
                </Routes>
              </CheckoutProvider>
            </CartDispatchContext.Provider>
          </CartStateContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('Checkout Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes the checkout flow successfully', async () => {
    // 1. Mock API Responses for Checkout
    api.post.mockImplementation((url, data) => {
      if (url === '/orders') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              razorpayOrder: {
                id: 'rzp_ord_123',
                amount: 11800,
                currency: 'INR',
              },
            },
          },
        });
      }
      if (url === '/orders/verify-payment') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              status: 'success',
            },
          },
        });
      }
      if (url === '/orders/validate-totals') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              subtotal: 100,
              discount: 0,
              shippingFee: 0,
              platformFee: 18,
              total: 118,
              finalTotal: 118,
              couponValid: false,
              couponMessage: '',
            },
          },
        });
      }
      if (url === '/orders/verify-payment') {
        return Promise.resolve({
          data: { success: true, message: 'Payment successful' },
        });
      }
      if (url === '/users/addresses') {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                _id: 'addr-1',
                name: 'Test User',
                phone: '1234567890',
                addressString: '123 Test St, Apt 4B',
                locality: 'Jayanagar',
                city: 'Bangalore',
                state: 'Karnataka',
                pincode: '560041',
                country: 'India',
                tag: 'Home',
                isDefault: true,
              },
            ],
          },
        });
      }
      return Promise.reject(new Error('Not found: ' + url));
    });

    api.get.mockImplementation((url) => {
      if (url === '/users/addresses') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url === '/coupons') {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith('/cms')) {
        return Promise.resolve({ data: {} });
      }
      return Promise.reject(new Error('Not found: ' + url));
    });

    // Mock Razorpay
    window.Razorpay = vi.fn().mockImplementation(function (options) {
      this.on = vi.fn();
      this.open = vi.fn(() => {
        // Simulate a successful payment callback
        options.handler({
          razorpay_payment_id: 'pay_29QQoUBi66xm2f',
          razorpay_order_id: 'rzp_ord_123',
          razorpay_signature: 'fake_signature',
        });
      });
    });

    // Append script to bypass loadScript hanging
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);

    // 1.5 Clear session storage and persistent memory cache
    window.sessionStorage.clear();
    window.localStorage.clear();
    const { persistentStorage } = await import('../utils/storage/persistentStorage');
    persistentStorage.removeItem('siri_checkout_is_adding_address', { session: true });
    persistentStorage.removeItem('siri_checkout_selected_address_id', { session: true });

    // 2. Render Checkout
    renderWithProviders(<Checkout />);

    // 3. User fills in shipping address
    // Click Add Address first
    const addAddressBtn = await screen.findByRole(
      'button',
      { name: /Add Address/i },
      { timeout: 5000 },
    );
    fireEvent.click(addAddressBtn);

    // Find address form inputs
    const fullNameInput = await screen.findByPlaceholderText(/Receiver full name/i);
    const phoneInput = screen.getByPlaceholderText(/10-digit mobile number/i);
    const addressInput = screen.getByPlaceholderText(
      /Flat, House no., Building, Apartment details/i,
    );
    const pincodeInput = screen.getByPlaceholderText(/e\.g\. 560041/i);
    const localityInput = screen.getByPlaceholderText(/e\.g\. Sector 4 \/ Jayanagar/i);
    const cityInput = screen.getByPlaceholderText(/^City$/i);
    const stateInput = screen.getByPlaceholderText(/^State$/i);

    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
    fireEvent.change(phoneInput, { target: { value: '1234567890' } });
    fireEvent.change(addressInput, { target: { value: '123 Test St, Apt 4B' } });
    fireEvent.change(pincodeInput, { target: { value: '560041' } });
    fireEvent.change(localityInput, { target: { value: 'Jayanagar' } });
    fireEvent.change(cityInput, { target: { value: 'Bangalore' } });
    fireEvent.change(stateInput, { target: { value: 'Karnataka' } });

    const saveAddressBtn = screen.getByRole('button', { name: /Save Address/i });
    fireEvent.click(saveAddressBtn);

    // 4. User is on Payment step, wait for "Place Order" button
    const placeOrderBtn = await screen.findByRole(
      'button',
      { name: /Place Order|Pay ₹/i },
      { timeout: 3000 },
    );
    expect(placeOrderBtn).toBeInTheDocument();
    // Check if the order total is displayed correctly
    expect(screen.getAllByText(/118/i).length).toBeGreaterThan(0);

    // 5. User clicks Place Order
    expect(placeOrderBtn).not.toBeDisabled();
    fireEvent.click(placeOrderBtn);

    // 6. Expect initiate API to be called
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/orders', expect.any(Object), expect.any(Object));
    });

    // 7. Expect Razorpay to be opened
    await waitFor(() => {
      expect(window.Razorpay).toHaveBeenCalled();
    });

    // 8. Expect verify API to be called after Razorpay mock handler simulates success
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/orders/verify-payment',
        {
          razorpayOrderId: 'rzp_ord_123',
          razorpayPaymentId: 'pay_29QQoUBi66xm2f',
          razorpaySignature: 'fake_signature',
        },
        expect.any(Object),
      );
    });
  }, 15000);
});
