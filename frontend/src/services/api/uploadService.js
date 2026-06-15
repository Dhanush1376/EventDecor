import api from '../api';
import { hasSessionMarker } from '../../utils/authStorage';
import { uploadWithRetry, uploadDirectToCloudinary } from './_shared';

const checkAuthLocal = () => hasSessionMarker();

export const uploadService = {
  uploadImages: async (formData, folder = 'siri-arts-crafts/direct-uploads', onProgress = null) => {
    let targetFolder = folder;
    if (
      !targetFolder.startsWith('siri-arts-crafts/') &&
      !targetFolder.startsWith('event_decor_ecommerce/')
    ) {
      targetFolder = `siri-arts-crafts/${folder}`;
    }
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
