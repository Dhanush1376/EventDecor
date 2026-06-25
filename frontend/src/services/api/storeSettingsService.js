import apiClient from '../api';

const storeSettingsService = {
  getPublicSettings: async () => {
    const response = await apiClient.get('/settings/public');
    return response.data.data;
  },

  getAdminSettings: async (fresh = false) => {
    const response = await apiClient.get(`/settings/admin${fresh ? '?fresh=true' : ''}`);
    return response.data.data;
  },

  updateSection: async (section, data) => {
    const response = await apiClient.patch(`/settings/${section}`, data);
    return response.data.data;
  },
};

export default storeSettingsService;
