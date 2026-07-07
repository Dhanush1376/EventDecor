import api from '../api';

export const cmsService = {
  getPublished: async () => {
    // Force revalidation to bypass stale-while-revalidate traps on hard-refresh
    const response = await api.get('/cms', {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
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
  analyzeShowcaseImage: async (imageUrl) => {
    const response = await api.post('/cms/ai-vision-showcase', { imageUrl });
    return response.data;
  },
  refineAiShowcase: async (previousData, prompt) => {
    const response = await api.post('/cms/ai-vision-refine-showcase', { previousData, prompt });
    return response.data;
  },
};
