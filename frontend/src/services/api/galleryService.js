import api from '../api';

export const galleryService = {
  getAll: async (params) => {
    const response = await api.get('/gallery', { params });
    return response.data;
  },
  getDynamicFilters: async (params) => {
    const response = await api.get('/gallery/filters', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/gallery/${id}`);
    return response.data;
  },
  getCategories: async () => {
    const response = await api.get('/gallery/categories');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/gallery', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/gallery/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/gallery/${id}`);
    return response.data;
  },
  like: async (id) => {
    const response = await api.post(`/gallery/${id}/like`);
    return response.data;
  },
};
