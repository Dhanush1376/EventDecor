import api from '../api';
import { hasSessionMarker } from '../../utils/auth/authStorage';

const checkAuthLocal = () => hasSessionMarker();

export const orderService = {
  create: async (orderData, options = {}) => {
    const response = await api.post('/orders', orderData, {
      ...options,
      _disableRetry: true,
      headers: {
        ...(options.headers || {}),
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
      },
    });
    return response.data;
  },
  verifyPayment: async (paymentData) => {
    const response = await api.post('/orders/verify-payment', paymentData, { _disableRetry: true });
    return response.data;
  },
  validateTotals: async (data) => {
    const response = await api.post('/orders/validate-totals', data);
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  getMyOrders: async () => {
    if (!checkAuthLocal()) return Promise.reject(new Error('Not authenticated'));
    const response = await api.get('/orders/my-orders');
    return response.data;
  },
  getAll: async (params) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },
  updateStatus: async (id, status, note, courierCharges) => {
    const response = await api.patch(`/orders/${id}/status`, { status, note, courierCharges });
    return response.data;
  },
  getPublicTrack: async (id, token) => {
    const response = await api.get(`/orders/${id}/public-track`, {
      params: { token },
    });
    return response.data;
  },
  updatePublicStatus: async (id, status, note, logisticsToken) => {
    const response = await api.patch(`/orders/${id}/public-status`, {
      status,
      note,
      logisticsToken,
    });
    return response.data;
  },
  sendCodOtp: async (email) => {
    const response = await api.post('/orders/send-cod-otp', { email }, { timeout: 30000 });
    return response.data;
  },
  verifyCodOtp: async (email, otp) => {
    const response = await api.post('/orders/verify-cod-otp', { email, otp });
    return response.data;
  },
  updateNotes: async (id, notes) => {
    const response = await api.patch(`/orders/${id}/notes`, { notes });
    return response.data;
  },

  softDelete: async (id) => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  },
};
