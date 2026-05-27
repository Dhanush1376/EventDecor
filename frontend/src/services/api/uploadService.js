import api, { refreshAccessToken } from '../api';
import { hasSessionMarker } from '../../utils/authStorage';
import logger from '../../utils/logger';

const checkAuthLocal = () => hasSessionMarker();

import { uploadWithRetry } from './_shared';
import { uploadDirectToCloudinary } from './_shared';
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
