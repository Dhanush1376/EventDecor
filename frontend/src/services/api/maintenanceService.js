import api from '../api';

export const maintenanceService = {
  getStatus: async () => {
    const response = await api.get('/maintenance/status');
    return response.data;
  },

  authenticate: async (email, password) => {
    const response = await api.post('/maintenance/gateway/authenticate', { email, password });
    return response.data;
  },

  verifyOtp: async (email, otp) => {
    const response = await api.post('/maintenance/gateway/verify-otp', { email, otp });
    return response.data;
  },

  logout: async (token) => {
    const response = await api.post(
      '/maintenance/gateway/logout',
      {},
      {
        headers: {
          'X-Maintenance-Token': token,
        },
      },
    );
    return response.data;
  },

  enableMaintenance: async (mode, reason) => {
    const response = await api.post('/maintenance/enable', { mode, reason });
    return response.data;
  },

  disableMaintenance: async (token) => {
    const response = await api.post(
      '/maintenance/disable',
      {},
      {
        headers: {
          'X-Maintenance-Token': token,
        },
      },
    );
    return response.data;
  },

  getAuditLogs: async (token) => {
    const response = await api.get('/maintenance/audit-logs', {
      headers: {
        'X-Maintenance-Token': token,
      },
    });
    return response.data;
  },
};
