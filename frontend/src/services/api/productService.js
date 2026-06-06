import api from '../api';
import { hasSessionMarker } from '../../utils/authStorage';

const checkAuthLocal = () => hasSessionMarker();

export const productService = {
  getAll: async (params) => {
    const response = await api.get('/products', { params });
    return response.data;
  },
  getAdminAll: async (params) => {
    const response = await api.get('/products/admin/all', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/products', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/products/${id}`);
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
