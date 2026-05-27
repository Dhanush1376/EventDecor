import api, { refreshAccessToken } from '../api';
import { hasSessionMarker } from '../../utils/authStorage';
import logger from '../../utils/logger';

const checkAuthLocal = () => hasSessionMarker();

export const notificationService = {
  saveConsent: async (consentData) => {
    const response = await api.post('/notifications/consent', consentData);
    return response.data;
  },
  getConsent: async (token) => {
    const response = await api.get(`/notifications/consent/${token}`);
    return response.data;
  },
  // ADMIN Campaign Methods
  createCampaign: async (campaignData) => {
    const response = await api.post('/notifications/admin/campaigns', campaignData);
    return response.data;
  },
  getCampaigns: async () => {
    const response = await api.get('/notifications/admin/campaigns');
    return response.data;
  },
  sendCampaign: async (id) => {
    const response = await api.post(`/notifications/admin/campaigns/${id}/send`);
    return response.data;
  },
  getTemplates: async () => {
    const response = await api.get('/notifications/admin/templates');
    return response.data;
  },
  createTemplate: async (templateData) => {
    const response = await api.post('/notifications/admin/templates', templateData);
    return response.data;
  },
  updateTemplate: async (id, templateData) => {
    const response = await api.patch(`/notifications/admin/templates/${id}`, templateData);
    return response.data;
  },
  getAnalytics: async () => {
    const response = await api.get('/notifications/admin/analytics');
    return response.data;
  },
  testSmtp: async (toEmail) => {
    const response = await api.get('/notifications/test-smtp-live', {
      params: { to: toEmail },
    });
    return response.data;
  },
  // ADMIN Real-time Alert Operations
  getAdminAlerts: async () => {
    const response = await api.get('/notifications/admin/alerts');
    return response.data;
  },
  markAdminAlertAllRead: async () => {
    const response = await api.patch('/notifications/admin/alerts/mark-all-read');
    return response.data;
  },
  markAdminAlertRead: async (id) => {
    const response = await api.patch(`/notifications/admin/alerts/${id}/read`);
    return response.data;
  },
  deleteAdminAlert: async (id) => {
    const response = await api.delete(`/notifications/admin/alerts/${id}`);
    return response.data;
  },
};
