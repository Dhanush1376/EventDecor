import api from '../api';

/**
 * Returns & exchanges are requested over WhatsApp and handled manually by the store.
 * The backend validates the order and builds the pre-filled message; nothing is stored.
 */
export const returnService = {
  getWhatsAppEligibility: (orderId) => api.get(`/returns/whatsapp/${orderId}`),

  buildWhatsAppRequest: (orderId, data) => api.post(`/returns/whatsapp/${orderId}`, data),

  // Read-only history of requests made through the previous automated flow.
  getMyReturns: () => api.get('/returns/my-returns'),

  getMyExchanges: () => api.get('/exchanges/my-exchanges'),

  getOrderReturnSummary: (orderId, config) =>
    api.get(`/returns/order/${orderId}/summary`, config),
};

export default returnService;
