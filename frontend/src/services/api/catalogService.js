import api from '../api';

export const catalogService = {
  // Registry
  getRegistry: async (params) => {
    const res = await api.get('/admin/catalog/registry', { params });
    return res.data;
  },
  createRegistryValue: async (data) => {
    const res = await api.post('/admin/catalog/registry', data);
    return res.data;
  },
  updateRegistryValue: async (id, data) => {
    const res = await api.put(`/admin/catalog/registry/${id}`, data);
    return res.data;
  },
  deleteRegistryValue: async (id) => {
    const res = await api.delete(`/admin/catalog/registry/${id}`);
    return res.data;
  },

  // Approvals & Merging
  getPendingApprovals: async () => {
    const res = await api.get('/admin/catalog/registry/pending');
    return res.data;
  },
  approveValue: async (id) => {
    const res = await api.patch(`/admin/catalog/registry/${id}/approve`);
    return res.data;
  },
  rejectValue: async (id) => {
    const res = await api.patch(`/admin/catalog/registry/${id}/reject`);
    return res.data;
  },
  mergeValue: async (id, targetId) => {
    const res = await api.post(`/admin/catalog/registry/${id}/merge`, { targetId });
    return res.data;
  },

  // Synonyms
  getSynonyms: async () => {
    const res = await api.get('/admin/catalog/synonyms');
    return res.data;
  },
  createSynonym: async (data) => {
    const res = await api.post('/admin/catalog/synonyms', data);
    return res.data;
  },
  deleteSynonym: async (id) => {
    const res = await api.delete(`/admin/catalog/synonyms/${id}`);
    return res.data;
  },

  // Analytics & Health
  getStats: async () => {
    const res = await api.get('/admin/catalog/stats');
    return res.data;
  },
  triggerHealthScan: async () => {
    const res = await api.post('/admin/catalog/health/run');
    return res.data;
  },
  getLearningLog: async () => {
    const res = await api.get('/admin/catalog/learning');
    return res.data;
  },
  forgetLearning: async (id) => {
    const res = await api.delete(`/admin/catalog/learning/${id}`);
    return res.data;
  },
};
