import api from '../../services/api';

export const whatsappAutomationService = {
  // --- Dashboard & Analytics ---
  getDashboard: () => api.get('/notifications/whatsapp/dashboard'),
  getAnalytics: () => api.get('/notifications/whatsapp/analytics'),
  getHealth: () => api.get('/notifications/whatsapp/health'),
  getQueueMetrics: () => api.get('/notifications/whatsapp/queues'),

  // --- Provider & Routing ---
  getProviderConfigs: () => api.get('/notifications/whatsapp/providers'),
  updateProviderConfig: (name, data) => api.put(`/notifications/whatsapp/providers/${name}`, data),
  forceCircuitOpen: (name) => api.post(`/notifications/whatsapp/providers/${name}/force-open`),
  getRoutingRules: () => api.get('/notifications/whatsapp/routing-rules'),
  updateRoutingRule: (category, data) =>
    api.put(`/notifications/whatsapp/routing-rules/${category}`, data),

  // --- Snapshots & Audit ---
  getSnapshots: () => api.get('/notifications/whatsapp/snapshots'),
  createSnapshot: (data) => api.post('/notifications/whatsapp/snapshots', data),
  rollbackSnapshot: (id) => api.post(`/notifications/whatsapp/snapshots/${id}/rollback`),
  getAuditLogs: (params) => api.get('/notifications/whatsapp/audit-logs', { params }),

  // --- RBAC & Approvals ---
  getRoles: () => api.get('/notifications/whatsapp-rbac/roles'),
  createRole: (data) => api.post('/notifications/whatsapp-rbac/roles', data),
  updateRole: (id, data) => api.put(`/notifications/whatsapp-rbac/roles/${id}`, data),

  getApprovals: () => api.get('/notifications/whatsapp-rbac/approvals'),
  approveRequest: (id, data) =>
    api.post(`/notifications/whatsapp-rbac/approvals/${id}/approve`, data),
  rejectRequest: (id, data) =>
    api.post(`/notifications/whatsapp-rbac/approvals/${id}/reject`, data),

  // --- Automations ---
  getAutomations: () => api.get('/notifications/whatsapp/automations'),
  getAutomation: (key) => api.get(`/notifications/whatsapp/automations/${key}`),
  updateAutomation: (key, data) => api.put(`/notifications/whatsapp/automations/${key}`, data),
  toggleAutomation: (key, enabled) =>
    api.patch(`/notifications/whatsapp/automations/${key}/toggle`, { enabled }),

  // --- Templates ---
  getTemplates: (params) => api.get('/notifications/whatsapp/templates', { params }),
  getCampaigns: () => api.get('/notifications/whatsapp/campaigns'),
  createCampaign: (data) => api.post('/notifications/whatsapp/campaigns', data),
  updateCampaign: (id, data) => api.put(`/notifications/whatsapp/campaigns/${id}`, data),
  deleteCampaign: (id) => api.delete(`/notifications/whatsapp/campaigns/${id}`),
  dispatchCampaign: (id) => api.post(`/notifications/whatsapp/campaigns/${id}/dispatch`),
  pauseCampaign: (id) => api.post(`/notifications/whatsapp/campaigns/${id}/pause`),
  validateCampaign: (id) => api.get(`/notifications/whatsapp/campaigns/${id}/validate`),
  getRecipients: () => api.get('/notifications/whatsapp/recipients'),
  createRecipient: (data) => api.post('/notifications/whatsapp/recipients', data),
  updateRecipient: (id, data) => api.put(`/notifications/whatsapp/recipients/${id}`, data),
  deleteRecipient: (id) => api.delete(`/notifications/whatsapp/recipients/${id}`),

  // --- Logs & Testing ---
  getLogs: (params) => api.get('/notifications/whatsapp/logs', { params }),
  getLogDetail: (id) => api.get(`/notifications/whatsapp/logs/${id}`),
  sendTest: (data) => api.post('/notifications/whatsapp/test', data),
  retryMessage: (logId) => api.post(`/notifications/whatsapp/retry/${logId}`),
  dryRun: (automationKey, payload) =>
    api.post(`/notifications/whatsapp/dry-run`, { automationKey, payload }),

  // --- Variables ---
  getVariables: () => api.get('/notifications/whatsapp/variables'),

  // --- Executive Analytics & Observability ---
  getExecutiveAnalytics: () => api.get('/notifications/whatsapp/executive-analytics'),
  getWorkflowFunnel: (id) => api.get(`/notifications/whatsapp/analytics/funnel/${id}`),
  getExperimentAnalytics: (automationId, experimentNodeId) =>
    api.get(`/notifications/whatsapp/analytics/experiment/${automationId}/${experimentNodeId}`),

  // --- Production Certification ---
  runAssessment: () => api.post('/notifications/whatsapp/assessment/run'),
  getAssessmentHistory: () => api.get('/notifications/whatsapp/assessment/history'),
  // Campaigns
  async getCampaigns() {
    const res = await api.get('/notifications/whatsapp/campaigns');
    return res.data;
  },

  async createCampaign(data) {
    const res = await api.post('/notifications/whatsapp/campaigns', data);
    return res.data;
  },

  async deleteCampaign(id) {
    const res = await api.delete(`/notifications/whatsapp/campaigns/${id}`);
    return res.data;
  },

  async dispatchCampaign(id) {
    const res = await api.post(`/notifications/whatsapp/campaigns/${id}/dispatch`);
    return res.data;
  },
};

export default whatsappAutomationService;
