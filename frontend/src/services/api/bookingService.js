import api from '../api';

export const bookingService = {
  initializeCheckout: async (data) => {
    const response = await api.post('/event-bookings/checkout/initialize', data);
    return response.data;
  },
  verifyCheckout: async (paymentData) => {
    const response = await api.post('/event-bookings/checkout/verify', paymentData);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/event-bookings', data);
    return response.data;
  },
  getMyBookings: async () => {
    const response = await api.get('/event-bookings/my-bookings');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/event-bookings/${id}`);
    return response.data;
  },
  respondQuote: async (id, approved) => {
    const response = await api.post(`/event-bookings/${id}/respond-quote`, { approved });
    return response.data;
  },
  submitPayment: async (id, paymentData) => {
    const response = await api.post(`/event-bookings/${id}/payment`, paymentData);
    return response.data;
  },
  postChat: async (id, message, attachments = []) => {
    const response = await api.post(`/event-bookings/${id}/chat`, { message, attachments });
    return response.data;
  },
  adminGetAll: async (params) => {
    const response = await api.get('/event-bookings/admin/all', { params });
    return response.data;
  },
  adminUpdateStatus: async (id, status) => {
    const response = await api.patch(`/event-bookings/${id}/status`, { status });
    return response.data;
  },
  adminUpdateQuotation: async (id, pricingData) => {
    const response = await api.patch(`/event-bookings/${id}/quotation`, pricingData);
    return response.data;
  },
  adminUpdateLogistics: async (id, logisticsData) => {
    const response = await api.patch(`/event-bookings/${id}/logistics`, logisticsData);
    return response.data;
  },
  adminUpdateNotes: async (id, adminNotes) => {
    const response = await api.patch(`/event-bookings/${id}/notes`, { adminNotes });
    return response.data;
  },
};
