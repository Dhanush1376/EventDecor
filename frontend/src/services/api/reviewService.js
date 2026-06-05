import api from '../api';
import { hasSessionMarker } from '../../utils/authStorage';

const checkAuthLocal = () => hasSessionMarker();

export const reviewService = {
  getProductReviews: async (productId, params) => {
    const response = await api.get(`/reviews/product/${productId}`, { params });
    return response.data;
  },
  getPublicReviews: async (params) => {
    const response = await api.get('/reviews/public', { params });
    return response.data;
  },
  incrementHelpful: async (id) => {
    const response = await api.post(`/reviews/${id}/helpful`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/reviews', data);
    return response.data;
  },
  getAll: async (params) => {
    const response = await api.get('/reviews', { params });
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.patch(`/reviews/${id}/status`, { status });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  },
  canReview: async (productId) => {
    const response = await api.get(`/reviews/can-review/${productId}`);
    return response.data;
  },
};
