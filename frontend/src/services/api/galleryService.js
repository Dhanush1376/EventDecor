/**
 * Discontinued gallery service stub.
 * Safely resolves with empty arrays/defaults to prevent breaking changes.
 */
export const galleryService = {
  getAll: async () => ({ success: true, data: { items: [], data: [], total: 0 } }),
  getDynamicFilters: async () => ({ success: true, data: {} }),
  getById: async () => ({ success: false, message: 'Gallery discontinued' }),
  getCategories: async () => ({ success: true, data: [] }),
  create: async () => ({ success: false, message: 'Gallery discontinued' }),
  update: async () => ({ success: false, message: 'Gallery discontinued' }),
  delete: async () => ({ success: true }),
  like: async () => ({ success: true }),
};

export default galleryService;
