import api from '../api';
import { hasSessionMarker } from '../../utils/authStorage';

const _checkAuthLocal = () => hasSessionMarker();

export const showcaseService = {
  getAll: async (params) => {
    const response = await api.get('/showcases', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/showcases/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/showcases', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/showcases/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/showcases/${id}`);
    return response.data;
  },
};
