import api, { refreshAccessToken } from '../api';
import { hasSessionMarker } from '../../utils/auth/authStorage';

const checkAuthLocal = () => hasSessionMarker();

export const authService = {
  // NOTE: Legacy login/register removed (A-01). Auth is now OTP-based via sendOTP + verifyOTP.
  adminLogin: async (email, password) => {
    const response = await api.post('/admin/auth/login', { email, password });
    return response.data;
  },
  adminSetup2FA: async (userId) => {
    const response = await api.post('/admin/auth/2fa/setup', { userId });
    return response.data;
  },
  adminEnable2FA: async (userId, token) => {
    const response = await api.post('/admin/auth/2fa/enable', { userId, token });
    return response.data;
  },
  adminVerify2FA: async (userId, token) => {
    const response = await api.post('/admin/auth/verify-2fa', { userId, token });
    return response.data;
  },
  getProfile: async (options = {}) => {
    if (!checkAuthLocal()) {
      return Promise.reject(new Error('Not authenticated'));
    }
    const response = await api.get('/auth/profile', options);
    return response.data;
  },
  sendOTP: async (email) => {
    const response = await api.post('/auth/send-otp', { email });
    return response.data;
  },
  verifyOTP: async (email, otp) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  },
  verify2FALogin: async (userId, token) => {
    const response = await api.post('/auth/2fa/verify-login', { userId, token });
    return response.data;
  },
  refresh: async () => {
    const token = await refreshAccessToken();
    if (!token) {
      throw new Error('Refresh failed');
    }
    return { success: true, data: { accessToken: token, token } };
  },
  logout: async (refreshToken) => {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
  },
};
