import api from '../api';

export const productService = {
  getAll: async (params) => {
    const response = await api.get('/products', { params });
    return response.data;
  },
  getAdminAll: async (params) => {
    const response = await api.get('/products/admin/all', { params });
    return response.data;
  },
  getDynamicFilters: async (params) => {
    const response = await api.get('/products/filters', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
  create: async (data, config = {}) => {
    const response = await api.post('/products', data, config);
    return response.data;
  },
  update: async (id, data, config = {}) => {
    const response = await api.put(`/products/${id}`, data, config);
    return response.data;
  },
  delete: async (id, config = {}) => {
    const response = await api.delete(`/products/${id}`, config);
    return response.data;
  },
  permanentDelete: async (id, config = {}) => {
    const response = await api.delete(`/products/${id}/permanent`, config);
    return response.data;
  },
  updateStatus: async (id, status, config = {}) => {
    const response = await api.patch(`/products/${id}/status`, { status }, config);
    return response.data;
  },
  toggleFeatured: async (id) => {
    const response = await api.patch(`/products/${id}/toggle-featured`);
    return response.data;
  },
  aiAutofill: async (title, imageSrc, categoryList) => {
    const response = await api.post('/products/ai-autofill', { title, imageSrc, categoryList });
    return response.data;
  },
  refineAiProduct: async (previousResult, prompt) => {
    const response = await api.post('/products/ai-refine', { previousResult, prompt });
    return response.data;
  },
  getCategories: async () => {
    const response = await api.get('/products/categories');
    return response.data;
  },
};
