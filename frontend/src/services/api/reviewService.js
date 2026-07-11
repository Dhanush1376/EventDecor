import api from '../api';

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
  getStats: async () => {
    const response = await api.get('/reviews/stats');
    return response.data;
  },
  getMyReview: async (productId) => {
    const response = await api.get(`/reviews/my/${productId}`);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/reviews/${id}`, data);
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
  getShowcaseReviews: async (showcaseId, params) => {
    const response = await api.get(`/reviews/showcase/${showcaseId}`, { params });
    return response.data;
  },
  canReviewShowcase: async (showcaseId) => {
    const response = await api.get(`/reviews/can-review-showcase/${showcaseId}`);
    return response.data;
  },
};
