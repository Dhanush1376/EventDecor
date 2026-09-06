import api from '../api';

export const customerIntelligenceService = {
  getOverview: async (params = {}) => {
    const response = await api.get('/customer-intelligence/overview', { params });
    return response.data.data;
  },

  getCustomers: async (params = {}) => {
    const response = await api.get('/customer-intelligence/customers', { params });
    return response.data;
  },

  getCustomer360: async (customerId) => {
    const response = await api.get(`/customer-intelligence/customers/${customerId}`);
    return response.data.data;
  },

  getCustomerJourney: async (customerId, sessionId) => {
    const url = sessionId
      ? `/customer-intelligence/customers/${customerId}/journey/${sessionId}`
      : `/customer-intelligence/customers/${customerId}/journey`;
    const response = await api.get(url);
    return response.data.data;
  },

  getCustomerMilestones: async (customerId) => {
    const response = await api.get(`/customer-intelligence/customers/${customerId}/milestones`);
    return response.data.data;
  },

  getCustomerTimeline: async (customerId, params = {}) => {
    const response = await api.get(`/customer-intelligence/customers/${customerId}/timeline`, {
      params,
    });
    return response.data;
  },

  getCustomerCommunications: async (customerId) => {
    const response = await api.get(`/customer-intelligence/customers/${customerId}/communications`);
    return response.data.data;
  },

  getCustomerNotes: async (customerId) => {
    const response = await api.get(`/customer-intelligence/customers/${customerId}/notes`);
    return response.data.data;
  },

  addCustomerNote: async (customerId, data) => {
    const response = await api.post(`/customer-intelligence/customers/${customerId}/notes`, data);
    return response.data.data;
  },

  updateCustomerNote: async (customerId, noteId, data) => {
    const response = await api.patch(
      `/customer-intelligence/customers/${customerId}/notes/${noteId}`,
      data,
    );
    return response.data.data;
  },

  deleteCustomerNote: async (customerId, noteId) => {
    const response = await api.delete(
      `/customer-intelligence/customers/${customerId}/notes/${noteId}`,
    );
    return response.data;
  },

  deleteCustomer: async (customerId, reason) => {
    const response = await api.delete(`/customer-intelligence/customers/${customerId}`, {
      data: { reason },
    });
    return response.data;
  },
};
