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
    const result = response.data.data;
    try {
      window.dispatchEvent(
        new CustomEvent('store-settings-updated', { detail: { section, data: result } }),
      );
      localStorage.setItem('store_settings_sync_time', Date.now().toString());
    } catch (_e) {
      // Ignored in non-browser environments
    }
    return result;
  },
};

export default storeSettingsService;
