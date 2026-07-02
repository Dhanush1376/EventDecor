import api from '../api';

export const customOrderService = {
  // ─── Configuration ───
  getConfig: async () => {
    const response = await api.get('/custom-orders/config');
    return response.data;
  },
  getAdminConfig: async () => {
    const response = await api.get('/custom-orders/config/admin');
    return response.data;
  },
  saveConfigDraft: async (content) => {
    const response = await api.post('/custom-orders/config/draft', { content });
    return response.data;
  },
  updateConfig: async (content) => {
    const response = await api.post('/custom-orders/config/publish', { content });
    return response.data;
  },

  // ─── Customer: Original Custom Order Flow ───
  create: async (data) => {
    const response = await api.post('/custom-orders', data);
    return response.data;
  },

  // ─── Customer: Product Customization Flow (New) ───
  submitProductCustomization: async (data) => {
    const response = await api.post('/custom-orders/product-customize', data);
    return response.data;
  },

  // ─── Customer: Draft Management ───
  saveDraft: async (data) => {
    const response = await api.post('/custom-orders/draft', data);
    return response.data;
  },
  getDrafts: async () => {
    const response = await api.get('/custom-orders/drafts');
    return response.data;
  },
  deleteDraft: async (id) => {
    const response = await api.delete(`/custom-orders/draft/${id}`);
    return response.data;
  },

  // ─── Customer: Orders ───
  getMyOrders: async () => {
    const response = await api.get('/custom-orders/my-orders');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/custom-orders/${id}`);
    return response.data;
  },

  // ─── Customer: Chat ───
  postMessage: async (id, text, attachments = [], source = 'customer_portal') => {
    const response = await api.post(`/custom-orders/${id}/messages`, { text, attachments, source });
    return response.data;
  },

  // ─── Customer: Quotation Response ───
  respondQuotation: async (id, status, reason = '') => {
    const response = await api.post(`/custom-orders/${id}/quotation/respond`, { status, reason });
    return response.data;
  },

  // ─── Order History (Customer or Admin) ───
  getHistory: async (id) => {
    const response = await api.get(`/custom-orders/${id}/history`);
    return response.data;
  },

  // ─── Admin: Orders List ───
  adminGetAll: async (params) => {
    const response = await api.get('/custom-orders', { params });
    return response.data;
  },

  // ─── Admin: Status ───
  adminUpdateStatus: async (id, status) => {
    const response = await api.patch(`/custom-orders/${id}/status`, { status });
    return response.data;
  },

  // ─── Admin: Priority ───
  adminUpdatePriority: async (id, priority) => {
    const response = await api.patch(`/custom-orders/${id}/priority`, { priority });
    return response.data;
  },

  // ─── Admin: Notes (legacy) ───
  adminUpdateNotes: async (id, adminNotes) => {
    const response = await api.patch(`/custom-orders/${id}/notes`, { adminNotes });
    return response.data;
  },

  // ─── Admin: Internal Notes (New) ───
  adminAddInternalNote: async (id, text) => {
    const response = await api.post(`/custom-orders/${id}/internal-notes`, { text });
    return response.data;
  },

  // ─── Admin: Staff Assignment (New) ───
  adminAssignStaff: async (id, staffAssignments) => {
    const response = await api.patch(`/custom-orders/${id}/assign`, { staffAssignments });
    return response.data;
  },

  // ─── Admin: Quotation ───
  adminUpdateQuotation: async (id, quotationData) => {
    const response = await api.patch(`/custom-orders/${id}/quotation`, quotationData);
    return response.data;
  },

  // ─── Admin: Archive ───
  adminArchive: async (id, archived) => {
    const response = await api.patch(`/custom-orders/${id}/archive`, { archived });
    return response.data;
  },
};
