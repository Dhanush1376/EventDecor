import api from '../api';

export const homepageService = {
  getHomepageData: async () => {
    const response = await api.get('/homepage');
    return response.data;
  }
};
