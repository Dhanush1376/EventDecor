import api from '../api';

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
  adminModerateReview: async (reviewId, action, customRewardAmount) => {
    const response = await api.post('/loyalty/admin/moderate-review', {
      reviewId,
      action,
      customRewardAmount,
    });
    return response.data;
  },
};
