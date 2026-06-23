import api from '../api';

export const blogService = {
  getBlogs: async () => {
    const response = await api.get('/blogs');
    return response.data;
  },

  getBlogBySlug: async (slug) => {
    const response = await api.get(`/blogs/slug/${slug}`);
    return response.data;
  },

  // Admin methods
  createBlog: async (data) => {
    const response = await api.post('/blogs', data);
    return response.data;
  },

  updateBlog: async (id, data) => {
    const response = await api.put(`/blogs/${id}`, data);
    return response.data;
  },

  deleteBlog: async (id) => {
    const response = await api.delete(`/blogs/${id}`);
    return response.data;
  },
};
