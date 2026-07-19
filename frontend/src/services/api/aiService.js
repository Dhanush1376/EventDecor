import api from '../api';

export const aiService = {
  getSettings: async () => {
    const response = await api.get('/ai/settings');
    return response.data;
  },

  updateSettings: async (data) => {
    const response = await api.put('/ai/settings', data);
    return response.data;
  },

  getProviders: async () => {
    const response = await api.get('/ai/providers');
    return response.data;
  },

  createProvider: async (data) => {
    const response = await api.post('/ai/providers', data);
    return response.data;
  },

  updateProvider: async (id, data) => {
    const response = await api.put(`/ai/providers/${id}`, data);
    return response.data;
  },

  deleteProvider: async (id) => {
    const response = await api.delete(`/ai/providers/${id}`);
    return response.data;
  },

  validateProvider: async (id) => {
    const response = await api.post(`/ai/providers/${id}/validate`);
    return response.data;
  },

  detectModels: async (id) => {
    const response = await api.post(`/ai/providers/${id}/detect-models`);
    return response.data;
  },

  getProviderHealth: async (id) => {
    const response = await api.get(`/ai/providers/${id}/health`);
    return response.data;
  },

  getUsage: async (params) => {
    const response = await api.get('/ai/usage', { params });
    return response.data;
  },

  getUsageSummary: async () => {
    const response = await api.get('/ai/usage/summary');
    return response.data;
  },
};

export default aiService;
