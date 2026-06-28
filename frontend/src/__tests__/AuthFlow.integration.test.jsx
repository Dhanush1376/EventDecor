import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';
import { useAuth } from '../context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../services/api';
import { AuthModal } from '../components/auth/AuthModal';
// Not strictly needed but keeps console clean
import { hasSessionMarker } from '../utils/auth/authStorage';

// Mock the API module
vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
  setAccessToken: vi.fn(),
  setAuthBootstrapActive: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (component) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>{component}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('allows user to request OTP and verifies it', async () => {
    // 1. Mock API responses
    api.post.mockImplementation((url, data) => {
      if (url === '/auth/send-otp') {
        return Promise.resolve({ data: { message: 'OTP sent' } });
      }
      if (url === '/auth/verify-otp') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              user: { id: '1', name: 'Test User', email: data.email, role: 'user' },
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
            },
          },
        });
      }
      return Promise.reject(new Error('Not found: ' + url));
    });

    api.get.mockImplementation((url) => {
      if (url === '/users/profile') {
        return Promise.resolve({
          data: { user: { id: '1', name: 'Test User', email: 'test@example.com', role: 'user' } },
        });
      }
      if (url.includes('/cart')) {
        return Promise.resolve({ data: { items: [] } });
      }
      return Promise.reject(new Error('Not found: ' + url));
    });

    // 2. Render AuthModal - Need to set isAuthModalOpen to true
    // We can do this by wrapping AuthModal in a component that opens it
    const TestComponent = () => {
      const { openAuthModal } = useAuth();
      return (
        <div>
          <button onClick={openAuthModal}>Open Modal</button>
          <AuthModal />
        </div>
      );
    };

    renderWithProviders(<TestComponent />);

    // Open Modal
    fireEvent.click(screen.getByText('Open Modal'));

    // Wait for form
    const emailInput = await screen.findByLabelText(/Email Address/i);
    const getOtpButton = screen.getByRole('button', { name: /Send Verification Code/i });

    // 3. User types email and submits
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(getOtpButton);

    // 4. Expect send-otp API to be called
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/send-otp', { email: 'test@example.com' });
    });

    // 5. User types OTP
    const otpInputs = await screen.findAllByRole('textbox');
    // Assuming the first 6 textboxes are the OTP inputs
    if (otpInputs.length < 6) throw new Error('OTP inputs not found');

    // Simulate typing the OTP by setting value on the first input and pasting, or just changing each
    fireEvent.change(otpInputs[0], { target: { value: '123456' } });

    const verifyButton = screen.getByRole('button', { name: /Verify and Login/i });
    fireEvent.click(verifyButton);

    // 6. Expect verify-otp API to be called
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/verify-otp', {
        email: 'test@example.com',
        otp: '123456',
      });
    });

    // Check if session marker was stored
    await waitFor(
      () => {
        expect(hasSessionMarker()).toBe(true);
      },
      { timeout: 2500 },
    );
  });
});
