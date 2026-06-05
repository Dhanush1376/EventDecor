import api from '../api';
import { hasSessionMarker } from '../../utils/authStorage';

const checkAuthLocal = () => hasSessionMarker();

export const customOrderService = {
  getConfig: async () => {
    const response = await api.get('/custom-orders/config');
    return response.data;
  },
  updateConfig: async (content) => {
    const response = await api.put('/custom-orders/config', { content });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/custom-orders', data);
    return response.data;
  },
  getMyOrders: async () => {
    const response = await api.get('/custom-orders/my-orders');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/custom-orders/${id}`);
    return response.data;
  },
  postMessage: async (id, text, attachments = []) => {
    const response = await api.post(`/custom-orders/${id}/messages`, { text, attachments });
    return response.data;
  },
  respondQuotation: async (id, status) => {
    const response = await api.post(`/custom-orders/${id}/quotation/respond`, { status });
    return response.data;
  },
  adminGetAll: async (params) => {
    const response = await api.get('/custom-orders', { params });
    return response.data;
  },
  adminUpdateStatus: async (id, status) => {
    const response = await api.patch(`/custom-orders/${id}/status`, { status });
    return response.data;
  },
  adminUpdatePriority: async (id, priority) => {
    const response = await api.patch(`/custom-orders/${id}/priority`, { priority });
    return response.data;
  },
  adminUpdateNotes: async (id, adminNotes) => {
    const response = await api.patch(`/custom-orders/${id}/notes`, { adminNotes });
    return response.data;
  },
  adminUpdateQuotation: async (id, quotationData) => {
    const response = await api.patch(`/custom-orders/${id}/quotation`, quotationData);
    return response.data;
  },
  adminArchive: async (id, archived) => {
    const response = await api.patch(`/custom-orders/${id}/archive`, { archived });
    return response.data;
  },
};
