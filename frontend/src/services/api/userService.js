import api from '../api';
import { hasSessionMarker } from '../../utils/auth/authStorage';

const checkAuthLocal = () => hasSessionMarker();

import { uploadWithRetry } from './_shared';
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
  getProfile: async (options = {}) => {
    if (!checkAuthLocal()) return Promise.reject(new Error('Not authenticated'));
    const response = await api.get('/users/profile', options);
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
  getWishlist: async (options = {}) => {
    if (!checkAuthLocal()) return Promise.reject(new Error('Not authenticated'));
    const response = await api.get('/users/wishlist', options);
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
  getCart: async (options = {}) => {
    if (!checkAuthLocal()) return Promise.reject(new Error('Not authenticated'));
    const response = await api.get('/users/cart', options);
    return response.data;
  },
  addToCart: async (productId, quantity, type, rentalInfo) => {
    const response = await api.post('/users/cart', { productId, quantity, type, rentalInfo });
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
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }, formData);
  },
  getTeam: async () => {
    const response = await api.get('/users/team');
    return response.data;
  },
};
