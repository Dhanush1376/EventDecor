import api, { refreshAccessToken } from '../api';
import { hasSessionMarker } from '../../utils/authStorage';
import logger from '../../utils/logger';

const checkAuthLocal = () => hasSessionMarker();

import { uploadWithRetry } from './_shared';
import { uploadDirectToCloudinary } from './_shared';
export const uploadService = {
  uploadImages: async (formData, folder = 'siri-arts-crafts/direct-uploads', onProgress = null) => {
    // If user asks for identity_docs, construct full path
    const targetFolder = folder === 'identity_docs' ? 'siri-arts-crafts/identity_docs' : folder;
    return uploadWithRetry(async (fd) => {
      return await uploadDirectToCloudinary(fd, false, targetFolder, onProgress);
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
