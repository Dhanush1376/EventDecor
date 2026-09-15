import apiClient from '../api';

const storeSettingsService = {
  getPublicSettings: async () => {
    const response = await apiClient.get('/settings/public');
    const data = response.data?.data || response.data;
    try {
      if (data) {
        localStorage.setItem('siri_public_settings', JSON.stringify(data));
        if (data.general?.storeName) {
          localStorage.setItem('siri_store_name', data.general.storeName);
        }
      }
    } catch (_e) {}
    return data;
  },

  getAdminSettings: async (fresh = false) => {
    const response = await apiClient.get(`/settings/admin${fresh ? '?fresh=true' : ''}`);
    const data = response.data?.data || response.data;
    try {
      if (data?.general?.storeName) {
        localStorage.setItem('siri_store_name', data.general.storeName);
      }
    } catch (_e) {}
    return data;
  },

  updateSection: async (section, data) => {
    const response = await apiClient.patch(`/settings/${section}`, data);
    const result = response.data?.data || response.data;
    try {
      if (section === 'general' && data?.storeName) {
        localStorage.setItem('siri_store_name', data.storeName);
      }
      const existing = localStorage.getItem('siri_public_settings');
      if (existing) {
        const parsed = JSON.parse(existing);
        parsed[section] = { ...(parsed[section] || {}), ...result };
        localStorage.setItem('siri_public_settings', JSON.stringify(parsed));
      }
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
