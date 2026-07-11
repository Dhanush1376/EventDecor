import api from '../../services/api';

export const whatsappAutomationService = {
  // --- Dashboard & Analytics ---
  getDashboard: () => api.get('/notifications/whatsapp/dashboard'),
  getAnalytics: () => api.get('/notifications/whatsapp/analytics'),
  getHealth: () => api.get('/notifications/whatsapp/health'),

  // --- Automations ---
  getAutomations: () => api.get('/notifications/whatsapp/automations'),
  getAutomation: (key) => api.get(`/notifications/whatsapp/automations/${key}`),
  updateAutomation: (key, data) => api.put(`/notifications/whatsapp/automations/${key}`, data),
  toggleAutomation: (key, enabled) =>
    api.patch(`/notifications/whatsapp/automations/${key}/toggle`, { enabled }),

  // --- Templates ---
  getTemplates: (params) => api.get('/notifications/whatsapp/templates', { params }),
  getTemplate: (id) => api.get(`/notifications/whatsapp/templates/${id}`),
  createTemplate: (data) => api.post('/notifications/whatsapp/templates', data),
  updateTemplate: (id, data) => api.put(`/notifications/whatsapp/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/notifications/whatsapp/templates/${id}`),

  // --- Recipients ---
  getRecipients: () => api.get('/notifications/whatsapp/recipients'),
  createRecipient: (data) => api.post('/notifications/whatsapp/recipients', data),
  updateRecipient: (id, data) => api.put(`/notifications/whatsapp/recipients/${id}`, data),
  deleteRecipient: (id) => api.delete(`/notifications/whatsapp/recipients/${id}`),

  // --- Logs & Testing ---
  getLogs: (params) => api.get('/notifications/whatsapp/logs', { params }),
  getLogDetail: (id) => api.get(`/notifications/whatsapp/logs/${id}`),
  sendTest: (data) => api.post('/notifications/whatsapp/test', data),
  retryMessage: (logId) => api.post(`/notifications/whatsapp/retry/${logId}`),

  // --- Variables ---
  getVariables: () => api.get('/notifications/whatsapp/variables'),
};

export default whatsappAutomationService;
