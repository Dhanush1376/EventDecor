import api, { refreshAccessToken } from '../api';
import { hasSessionMarker } from '../../utils/authStorage';
import logger from '../../utils/logger';

const checkAuthLocal = () => hasSessionMarker();

export const cmsService = {
  getPublished: async () => {
    const response = await api.get('/cms');
    return response.data;
  },
  getSection: async (key) => {
    const response = await api.get(`/cms/${key}`);
    return response.data;
  },
  updateSection: async (key, data) => {
    const response = await api.put(`/cms/${key}`, data);
    return response.data;
  },
  publishAll: async () => {
    const response = await api.post('/cms/publish-all');
    return response.data;
  },
  aiGenerateContent: async (text, style) => {
    const response = await api.post('/cms/ai-generate', { text, style });
    return response.data;
  },
};
