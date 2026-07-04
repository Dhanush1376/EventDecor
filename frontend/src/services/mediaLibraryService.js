import api from './api';

const API_URL = '/media';

export const mediaLibraryService = {
  /**
   * Uploads a file via the central Media Library API.
   */
  uploadMedia: async (file, folder = 'default', tags = [], version = 'v2') => {
    const formData = new FormData();
    formData.append('images', file); // API expects 'images' field based on unified route
    if (folder) formData.append('folder', folder);
    if (tags.length) formData.append('tags', tags.join(','));

    const response = await api.post(`${API_URL}/upload?v=${version}`, formData);
    return response.data;
  },

  /**
   * Replaces an existing media asset.
   */
  replaceMedia: async (id, file, tags = []) => {
    const formData = new FormData();
    formData.append('file', file);
    if (tags.length) formData.append('tags', tags.join(','));

    const response = await api.put(`${API_URL}/library/${id}/replace`, formData);
    return response.data;
  },

  /**
   * Fetches paginated list of media from the library.
   */
  getMediaLibrary: async (params = {}) => {
    const { page = 1, limit = 50, folder, type, search, status = 'active' } = params;

    // Construct query string
    const query = new URLSearchParams();
    query.append('page', page);
    query.append('limit', limit);
    query.append('status', status);
    if (folder) query.append('folder', folder);
    if (type) query.append('type', type);
    if (search) query.append('search', search);

    const response = await api.get(`${API_URL}/library?${query.toString()}`);
    return response.data;
  },

  /**
   * Soft deletes a media asset from the library.
   */
  deleteMedia: async (id) => {
    const response = await api.delete(`${API_URL}/library/${id}`);
    return response.data;
  },

  /**
   * Restores a soft-deleted media asset.
   */
  restoreMedia: async (id) => {
    const response = await api.post(`${API_URL}/library/${id}/restore`);
    return response.data;
  },

  /**
   * Retrieves high-level media stats.
   */
  getMediaStats: async () => {
    const response = await api.get(`${API_URL}/stats`);
    return response.data;
  },
};
