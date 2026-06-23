import api from '../api';

const RENTAL_BASE = '/rentals';
const POLICY_BASE = '/rental-policies';
const SERVICE_AREA_BASE = '/service-areas';

const rentalService = {
  // ─── Customer Endpoints ───
  calculateCost: async (productId, startDate, endDate) => {
    const res = await api.post(`${RENTAL_BASE}/calculate`, { productId, startDate, endDate });
    return res.data;
  },

  checkAvailability: async (productId, startDate, endDate) => {
    const res = await api.post(`${RENTAL_BASE}/check-availability`, {
      productId,
      startDate,
      endDate,
    });
    return res.data;
  },

  checkServiceArea: async (lat, lng) => {
    const res = await api.post(`${RENTAL_BASE}/check-service-area`, { lat, lng });
    return res.data;
  },

  createOrder: async (data) => {
    const res = await api.post(RENTAL_BASE, data);
    return res.data;
  },

  verifyPayment: async (data) => {
    const res = await api.post(`${RENTAL_BASE}/verify-payment`, data);
    return res.data;
  },

  getMyRentals: async (params = {}) => {
    const res = await api.get(`${RENTAL_BASE}/my-rentals`, { params });
    return res.data;
  },

  getDetail: async (id) => {
    const res = await api.get(`${RENTAL_BASE}/detail/${id}`);
    return res.data;
  },

  requestReturn: async (id) => {
    const res = await api.post(`${RENTAL_BASE}/${id}/request-return`);
    return res.data;
  },

  cancelRental: async (id) => {
    const res = await api.post(`${RENTAL_BASE}/${id}/cancel`);
    return res.data;
  },

  // ─── Admin Endpoints ───
  adminGetAll: async (params = {}) => {
    const res = await api.get(`${RENTAL_BASE}/admin/all`, { params });
    return res.data;
  },

  adminGetDetail: async (id) => {
    const res = await api.get(`${RENTAL_BASE}/admin/detail/${id}`);
    return res.data;
  },

  adminUpdateStatus: async (id, status, note = '') => {
    const res = await api.patch(`${RENTAL_BASE}/admin/${id}/status`, { status, note });
    return res.data;
  },

  adminInspect: async (id, data) => {
    const res = await api.post(`${RENTAL_BASE}/admin/${id}/inspect`, data);
    return res.data;
  },

  adminReleaseDeposit: async (id, amount, reason) => {
    const res = await api.post(`${RENTAL_BASE}/admin/${id}/release-deposit`, { amount, reason });
    return res.data;
  },

  adminGetCalendar: async (productId, month, year) => {
    const res = await api.get(`${RENTAL_BASE}/admin/calendar/${productId}`, {
      params: { month, year },
    });
    return res.data;
  },

  adminGetAnalytics: async () => {
    const res = await api.get(`${RENTAL_BASE}/admin/analytics`);
    return res.data;
  },

  adminCancelRental: async (id) => {
    const res = await api.post(`${RENTAL_BASE}/admin/${id}/cancel`);
    return res.data;
  },

  // ─── Rental Policy ───
  getPolicy: async () => {
    const res = await api.get(POLICY_BASE);
    return res.data;
  },

  updatePolicy: async (data) => {
    const res = await api.put(POLICY_BASE, data);
    return res.data;
  },

  // ─── Service Areas ───
  getServiceAreas: async () => {
    const res = await api.get(SERVICE_AREA_BASE);
    return res.data;
  },

  createServiceArea: async (data) => {
    const res = await api.post(SERVICE_AREA_BASE, data);
    return res.data;
  },

  updateServiceArea: async (id, data) => {
    const res = await api.put(`${SERVICE_AREA_BASE}/${id}`, data);
    return res.data;
  },

  deleteServiceArea: async (id) => {
    const res = await api.delete(`${SERVICE_AREA_BASE}/${id}`);
    return res.data;
  },

  checkServiceAreaPublic: async (lat, lng) => {
    const res = await api.post(`${SERVICE_AREA_BASE}/check`, { lat, lng });
    return res.data;
  },
};

export default rentalService;
