import api from '../api';
import { hasSessionMarker } from '../../utils/auth/authStorage';

const checkAuthLocal = () => hasSessionMarker();

export const couponService = {
  getAll: async () => {
    if (!checkAuthLocal()) return Promise.reject(new Error('Not authenticated'));
    const response = await api.get('/coupons');
    return response.data;
  },
  getProductCoupons: async (productId) => {
    const response = await api.get(`/coupons/product/${productId}`);
    return response.data;
  },
  validate: async (code) => {
    const response = await api.get(`/coupons/validate/${code}`);
    return response.data;
  },
  apply: async (code, orderAmount) => {
    const response = await api.post('/coupons/apply', { code, orderAmount });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/coupons', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/coupons/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/coupons/${id}`);
    return response.data;
  },
};
