import api, { refreshAccessToken } from '../api';
import { hasSessionMarker } from '../../utils/authStorage';
import logger from '../../utils/logger';

const checkAuthLocal = () => hasSessionMarker();

export const eventService = {
  getAll: async (params) => {
    const response = await api.get('/events', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/events', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
  },
};
