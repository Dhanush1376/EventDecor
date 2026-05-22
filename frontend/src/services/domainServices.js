import api from './api';

import logger from '../utils/logger';
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  adminLogin: async (email, password) => {
    const response = await api.post('/admin/auth/login', { email, password });
    return response.data;
  },
  adminSetup2FA: async (userId) => {
    const response = await api.post('/admin/auth/2fa/setup', { userId });
    return response.data;
  },
  adminEnable2FA: async (userId, token) => {
    const response = await api.post('/admin/auth/2fa/enable', { userId, token });
    return response.data;
  },
  adminVerify2FA: async (userId, token) => {
    const response = await api.post('/admin/auth/verify-2fa', { userId, token });
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  sendOTP: async (email, password) => {
    const response = await api.post('/auth/send-otp', { email, password });
    return response.data;
  },
  verifyOTP: async (email, otp) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  },
  verify2FALogin: async (userId, token) => {
    const response = await api.post('/auth/2fa/verify-login', { userId, token });
    return response.data;
  },
  refresh: async (refreshToken) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },
  logout: async (refreshToken) => {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
  },
};

export const productService = {
  getAll: async (params) => {
    const response = await api.get('/products', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/products', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
  toggleFeatured: async (id) => {
    const response = await api.patch(`/products/${id}/toggle-featured`);
    return response.data;
  },
  aiAutofill: async (title, imageSrc, categoryList) => {
    const response = await api.post('/products/ai-autofill', { title, imageSrc, categoryList });
    return response.data;
  },
  getCategories: async () => {
    const response = await api.get('/products/categories');
    return response.data;
  },
};

export const orderService = {
  create: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },
  verifyPayment: async (paymentData) => {
    const response = await api.post('/orders/verify-payment', paymentData);
    return response.data;
  },
  validateTotals: async (data) => {
    const response = await api.post('/orders/validate-totals', data);
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  getMyOrders: async () => {
    const response = await api.get('/orders/my-orders');
    return response.data;
  },
  getAll: async (params) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },
  updateStatus: async (id, status, note, courierCharges) => {
    const response = await api.patch(`/orders/${id}/status`, { status, note, courierCharges });
    return response.data;
  },
  getPublicTrack: async (id, token) => {
    const response = await api.get(`/orders/${id}/public-track`, {
      params: { token },
    });
    return response.data;
  },
  updatePublicStatus: async (id, status, note, logisticsToken) => {
    const response = await api.patch(`/orders/${id}/public-status`, { status, note, logisticsToken });
    return response.data;
  },
  sendCodOtp: async (email) => {
    const response = await api.post('/orders/send-cod-otp', { email });
    return response.data;
  },
  verifyCodOtp: async (email, otp) => {
    const response = await api.post('/orders/verify-cod-otp', { email, otp });
    return response.data;
  },
  updateNotes: async (id, notes) => {
    const response = await api.patch(`/orders/${id}/notes`, { notes });
    return response.data;
  },
};

export const eventService = {
  getAll: async (params) => {
    const response = await api.get('/events', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/events', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
  },
};

export const cmsService = {
  getPublished: async () => {
    const response = await api.get('/cms');
    return response.data;
  },
  getSection: async (key) => {
    const response = await api.get(`/cms/${key}`);
    return response.data;
  },
  updateSection: async (key, data) => {
    const response = await api.put(`/cms/${key}`, data);
    return response.data;
  },
  publishAll: async () => {
    const response = await api.post('/cms/publish-all');
    return response.data;
  },
  aiGenerateContent: async (text, style) => {
    const response = await api.post('/cms/ai-generate', { text, style });
    return response.data;
  },
};

export const galleryService = {
  getAll: async (params) => {
    const response = await api.get('/gallery', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/gallery/${id}`);
    return response.data;
  },
  getCategories: async () => {
    const response = await api.get('/gallery/categories');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/gallery', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/gallery/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/gallery/${id}`);
    return response.data;
  },
  like: async (id) => {
    const response = await api.post(`/gallery/${id}/like`);
    return response.data;
  },
};

export const reviewService = {
  getProductReviews: async (productId, params) => {
    const response = await api.get(`/reviews/product/${productId}`, { params });
    return response.data;
  },
  getPublicReviews: async (params) => {
    const response = await api.get('/reviews/public', { params });
    return response.data;
  },
  incrementHelpful: async (id) => {
    const response = await api.post(`/reviews/${id}/helpful`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/reviews', data);
    return response.data;
  },
  getAll: async (params) => {
    const response = await api.get('/reviews', { params });
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.patch(`/reviews/${id}/status`, { status });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  },
  canReview: async (productId) => {
    const response = await api.get(`/reviews/can-review/${productId}`);
    return response.data;
  },
};

export const couponService = {
  getAll: async () => {
    const response = await api.get('/coupons');
    return response.data;
  },
  validate: async (code) => {
    const response = await api.get(`/coupons/validate/${code}`);
    return response.data;
  },
  apply: async (code, orderAmount) => {
    const response = await api.post('/coupons/apply', { code, orderAmount });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/coupons', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/coupons/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/coupons/${id}`);
    return response.data;
  },
};

export const userService = {
  getAll: async (params) => {
    const response = await api.get('/users', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  updateRole: async (id, role) => {
    const response = await api.patch(`/users/${id}/role`, { role });
    return response.data;
  },
  getCategories: async () => {
    const response = await api.get('/users/categories');
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.patch('/users/profile', data);
    return response.data;
  },
  getAddresses: async () => {
    const response = await api.get('/users/addresses');
    return response.data;
  },
  addAddress: async (data) => {
    const response = await api.post('/users/addresses', data);
    return response.data;
  },
  updateAddress: async (id, data) => {
    const response = await api.patch(`/users/addresses/${id}`, data);
    return response.data;
  },
  deleteAddress: async (id) => {
    const response = await api.delete(`/users/addresses/${id}`);
    return response.data;
  },
  getWishlist: async () => {
    const response = await api.get('/users/wishlist');
    return response.data;
  },
  toggleWishlist: async (productId) => {
    const response = await api.post('/users/wishlist/toggle', { productId });
    return response.data;
  },
  setDefaultAddress: async (id) => {
    const response = await api.patch(`/users/addresses/${id}/default`);
    return response.data;
  },
  getCart: async () => {
    const response = await api.get('/users/cart');
    return response.data;
  },
  addToCart: async (productId, quantity) => {
    const response = await api.post('/users/cart', { productId, quantity });
    return response.data;
  },
  syncCart: async (cartItems) => {
    const response = await api.put('/users/cart', { cartItems });
    return response.data;
  },
  removeFromCart: async (productId) => {
    const response = await api.delete(`/users/cart/${productId}`);
    return response.data;
  },
  getRecentlyViewed: async () => {
    const response = await api.get('/users/recently-viewed');
    return response.data;
  },
  trackRecentlyViewed: async (productId) => {
    const response = await api.post('/users/recently-viewed', { productId });
    return response.data;
  },
  updatePreferences: async (preferences) => {
    const response = await api.patch('/users/preferences', preferences);
    return response.data;
  },
  uploadAvatar: async (formData) => {
    return uploadWithRetry(async (fd) => {
      const response = await api.post('/users/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    }, formData);
  },
  getTeam: async () => {
    const response = await api.get('/users/team');
    return response.data;
  },
};

const uploadWithRetry = async (uploadFn, formData, retries = 3, delayMs = 1500) => {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadFn(formData);
    } catch (error) {
      lastError = error;
      logger.warn(`[UPLOAD RETRY] Frontend upload attempt ${attempt}/${retries} failed. Retrying...`, error);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError || new Error(`Upload failed after ${retries} attempts`);
};

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

const uploadDirectToCloudinary = async (formData, isSingle = false) => {
  const sigRes = await api.get('/upload/signed-url');
  const { signature, timestamp, cloudName, apiKey, folder } = sigRes.data;

  const files = [];
  for (let value of formData.values()) {
    if (value instanceof File || value instanceof Blob) {
      files.push(value);
    }
  }

  const uploadPromises = files.map(async (file) => {
    const cloudinaryData = new FormData();
    cloudinaryData.append('file', file);
    cloudinaryData.append('api_key', apiKey);
    cloudinaryData.append('timestamp', timestamp);
    cloudinaryData.append('signature', signature);
    cloudinaryData.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: cloudinaryData,
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Cloudinary direct upload failed: ${errorText}`);
    }
    return res.json();
  });

  const results = await Promise.all(uploadPromises);
  const urls = results.map(r => r.secure_url || r.url);

  if (isSingle) {
    return { success: true, url: urls[0] };
  } else {
    return { success: true, images: urls };
  }
};

export const uploadService = {
  uploadImages: async (formData, folder = 'products') => {
    return uploadWithRetry(async (fd) => {
      return await uploadDirectToCloudinary(fd, false);
    }, formData);
  },
  uploadCMS: async (formData) => {
    return uploadWithRetry(async (fd) => {
      return await uploadDirectToCloudinary(fd, true);
    }, formData);
  },
  uploadInspirations: async (formData) => {
    return uploadWithRetry(async (fd) => {
      const response = await api.post('/upload/inspirations', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }, formData);
  },
};

export const inquiryService = {
  create: async (data) => {
    const response = await api.post('/inquiries', data);
    return response.data;
  },
  getAll: async (params) => {
    const response = await api.get('/inquiries', { params });
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.patch(`/inquiries/${id}/status`, { status });
    return response.data;
  },
};

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

export const customOrderService = {
  getConfig: async () => {
    const response = await api.get('/custom-orders/config');
    return response.data;
  },
  updateConfig: async (content) => {
    const response = await api.put('/custom-orders/config', { content });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/custom-orders', data);
    return response.data;
  },
  getMyOrders: async () => {
    const response = await api.get('/custom-orders/my-orders');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/custom-orders/${id}`);
    return response.data;
  },
  postMessage: async (id, text, attachments = []) => {
    const response = await api.post(`/custom-orders/${id}/messages`, { text, attachments });
    return response.data;
  },
  respondQuotation: async (id, status) => {
    const response = await api.post(`/custom-orders/${id}/quotation/respond`, { status });
    return response.data;
  },
  adminGetAll: async (params) => {
    const response = await api.get('/custom-orders', { params });
    return response.data;
  },
  adminUpdateStatus: async (id, status) => {
    const response = await api.patch(`/custom-orders/${id}/status`, { status });
    return response.data;
  },
  adminUpdatePriority: async (id, priority) => {
    const response = await api.patch(`/custom-orders/${id}/priority`, { priority });
    return response.data;
  },
  adminUpdateNotes: async (id, adminNotes) => {
    const response = await api.patch(`/custom-orders/${id}/notes`, { adminNotes });
    return response.data;
  },
  adminUpdateQuotation: async (id, quotationData) => {
    const response = await api.patch(`/custom-orders/${id}/quotation`, quotationData);
    return response.data;
  },
  adminArchive: async (id, archived) => {
    const response = await api.patch(`/custom-orders/${id}/archive`, { archived });
    return response.data;
  },
};

export const loyaltyService = {
  getDashboard: async () => {
    const response = await api.get('/loyalty/dashboard');
    return response.data;
  },
  applyReferral: async (referralCode) => {
    const response = await api.post('/loyalty/apply-referral', { referralCode });
    return response.data;
  },
  adminGetReviews: async () => {
    const response = await api.get('/loyalty/admin/reviews');
    return response.data;
  },
  adminModerateReview: async (reviewId, action) => {
    const response = await api.post('/loyalty/admin/moderate-review', { reviewId, action });
    return response.data;
  }
};

export const bookingService = {
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

export const showcaseService = {
  getAll: async (params) => {
    const response = await api.get('/showcases', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/showcases/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/showcases', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/showcases/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/showcases/${id}`);
    return response.data;
  },
};
