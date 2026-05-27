import api, { refreshAccessToken } from '../api';
import { hasSessionMarker } from '../../utils/authStorage';
import logger from '../../utils/logger';

const checkAuthLocal = () => hasSessionMarker();

export const inquiryService = {
  create: async (data) => {
    const response = await api.post('/inquiries', data);
    return response.data;
  },
  getAll: async (params) => {
    const response = await api.get('/inquiries', { params });
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.patch(`/inquiries/${id}/status`, { status });
    return response.data;
  },
};
