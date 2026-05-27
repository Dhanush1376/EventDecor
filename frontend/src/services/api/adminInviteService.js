import api, { refreshAccessToken } from '../api';
import { hasSessionMarker } from '../../utils/authStorage';
import logger from '../../utils/logger';

const checkAuthLocal = () => hasSessionMarker();

export const adminInviteService = {
  sendInvite: async (data) => {
    const response = await api.post('/admin/invites', data);
    return response.data;
  },
  getPendingInvites: async (params) => {
    const response = await api.get('/admin/invites/pending', { params });
    return response.data;
  },
  getInviteHistory: async (params) => {
    const response = await api.get('/admin/invites/history', { params });
    return response.data;
  },
  revokeInvite: async (id) => {
    const response = await api.delete(`/admin/invites/${id}/revoke`);
    return response.data;
  },
  getMyPendingInvite: async () => {
    const response = await api.get('/admin/invites/my-pending');
    return response.data;
  },
  respondToInvite: async (inviteId, action) => {
    const response = await api.post('/admin/invites/respond', { inviteId, action });
    return response.data;
  },
};
