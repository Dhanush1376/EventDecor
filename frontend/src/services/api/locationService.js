import api from '../api';

export const locationService = {
  getLocations: async () => {
    const response = await api.get('/locations');
    return response.data;
  },

  getLocationBySlug: async (slug) => {
    const response = await api.get(`/locations/slug/${slug}`);
    return response.data;
  },

  // Admin methods
  createLocation: async (data) => {
    const response = await api.post('/locations', data);
    return response.data;
  },

  updateLocation: async (id, data) => {
    const response = await api.put(`/locations/${id}`, data);
    return response.data;
  },

  deleteLocation: async (id) => {
    const response = await api.delete(`/locations/${id}`);
    return response.data;
  },
};
