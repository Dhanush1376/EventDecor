import api from '../api';

/**
 * Frontend service for Return Management API
 */
export const returnService = {
  // Admin Endpoints
  getDashboardStats: () => api.get('/returns/admin/dashboard'),

  getAllReturns: (params) => api.get('/returns/admin/all', { params }),

  getReturnDetails: (id) => api.get(`/returns/admin/${id}`),

  approveReturn: (id) => api.patch(`/returns/admin/${id}/approve`),

  rejectReturn: (id, data) => api.patch(`/returns/admin/${id}/reject`, data),

  transitionStatus: (id, data) => api.patch(`/returns/admin/${id}/transition`, data),

  triggerRefund: (id) => api.post(`/returns/admin/${id}/refund`),

  addInternalNote: (id, data) => api.post(`/returns/admin/${id}/notes`, data),

  bulkAction: (data) => api.post('/returns/admin/bulk', data),

  getOrderReturnSummary: (orderId) => api.get(`/returns/order/${orderId}/summary`),

  schedulePickup: (id, data) => api.patch(`/returns/admin/${id}/pickup`, data),

  completeReturn: (id) => api.post(`/returns/admin/${id}/complete`),

  transitionExchangeReplacement: (id, data) =>
    api.patch(`/returns/admin/exchanges/${id}/transition`, data),

  getAllExchanges: (params) => api.get('/exchanges/admin/all', { params }),

  getRefundStats: () => api.get('/returns/admin/refunds/stats'),

  getPickupList: (params) => api.get('/returns/admin/pickups', { params }),

  getFraudAlerts: (params) => api.get('/returns/admin/fraud/alerts', { params }),

  getHighRiskCustomers: (params) => api.get('/returns/admin/fraud/customers', { params }),

  getAnalytics: (params) => api.get('/returns/admin/analytics', { params }),

  getReturnSettings: () => api.get('/returns/admin/settings'),

  getEnterpriseAnalytics: () => api.get('/returns/admin/enterprise-analytics'),

  updateReturnSettings: (data) => api.put('/returns/admin/settings', data),

  getFraudMetrics: () => api.get('/returns/admin/fraud/metrics'),

  getExchangeStats: () => api.get('/returns/admin/exchange-stats'),

  getPickupStats: () => api.get('/returns/admin/pickup-stats'),

  // Warehouse Endpoints
  getInspectionQueue: () => api.get('/returns/warehouse/queue'),

  markItemReceived: (id, itemIndex) =>
    api.patch(`/returns/warehouse/${id}/items/${itemIndex}/receive`),

  submitInspection: (id, itemIndex, data) =>
    api.patch(`/returns/warehouse/${id}/items/${itemIndex}/inspect`, data),

  // Customer Endpoints
  createReturn: (data) => api.post('/returns', data),

  getMyReturns: () => api.get('/returns/my-returns'),

  getReturnById: (id) => api.get(`/returns/${id}`),

  getOrderReturnState: (orderId) => api.get(`/returns/order-state/${orderId}`),

  addConversationMessage: (id, data) => api.post(`/returns/${id}/message`, data),

  cancelReturn: (id) => api.post(`/returns/${id}/cancel`),

  updateRefundMethod: (id, data) => api.patch(`/returns/${id}/refund-method`, data),

  createExchange: (data) => api.post('/exchanges', data),

  getMyExchanges: () => api.get('/exchanges/my-exchanges'),

  verifyExchangePayment: (data) => api.post('/exchanges/verify-payment', data),
};

export default returnService;
