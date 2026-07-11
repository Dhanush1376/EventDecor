import api from '../api';
import { uploadWithRetry } from './_shared';
import { mediaLibraryService } from '../mediaLibraryService';

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
      // Convert standard FormData back to array of files (since frontend components pass FormData)
      const files = fd.getAll('images').length > 0 ? fd.getAll('images') : fd.getAll('file');
      if (!files.length) return { success: false, error: 'No files to upload' };

      const results = [];
      for (const file of files) {
        if (file instanceof File || file instanceof Blob) {
          const res = await mediaLibraryService.uploadMedia(file, targetFolder, [], 'v1');
          if (res.images && res.images.length > 0) {
            results.push(res.images[0]);
          }
        }
      }

      // Map back to legacy expected response format
      return { success: true, images: results };
    }, formData);
  },
  uploadReviewImages: async (formData) => {
    return uploadWithRetry(async (fd) => {
      const response = await api.post('/upload/reviews', fd);
      return response.data;
    }, formData);
  },
  uploadCMS: async (formData) => {
    return uploadWithRetry(async (fd) => {
      const file = fd.get('images') || fd.get('file');
      if (!file) return { success: false, error: 'No files to upload' };
      const res = await mediaLibraryService.uploadMedia(file, 'cms', []);
      return { success: true, data: res.data };
    }, formData);
  },
  uploadInspirations: async (formData) => {
    return uploadWithRetry(async (fd) => {
      const response = await api.post('/upload/inspirations', fd);
      return response.data;
    }, formData);
  },
};
