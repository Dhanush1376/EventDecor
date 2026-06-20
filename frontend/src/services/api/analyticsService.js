import api from '../api';
import { hasSessionMarker } from '../../utils/authStorage';

const _checkAuthLocal = () => hasSessionMarker();

export const analyticsService = {
  getDashboardStats: async () => {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  },
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/analytics/audit-logs', { params });
    return response.data;
  },
  createAuditLog: async (action, details, status) => {
    const response = await api.post('/analytics/audit-logs', { action, details, status });
    return response.data;
  },
  clearAuditLogs: async () => {
    const response = await api.delete('/analytics/audit-logs');
    return response.data;
  },
};
