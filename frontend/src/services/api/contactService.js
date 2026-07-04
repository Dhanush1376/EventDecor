import api from '../api';

export const contactService = {
  resolveContact: async () => {
    const response = await api.get('/contact/resolve');
    return response.data;
  },
  updateContact: async (phone) => {
    const response = await api.post('/contact/update', { phone });
    return response.data;
  },
};
