import api from '../api';

class PolicyService {
  /**
   * Fetch all policies (Admin only)
   */
  async getAll() {
    const response = await api.get('/policies');
    return response.data;
  }

  /**
   * Fetch all published policies (Public)
   */
  async getPublicPolicies() {
    const response = await api.get('/policies/public/list');
    return response.data;
  }

  /**
   * Fetch a single policy by slug (Public)
   */
  async getBySlug(slug) {
    const response = await api.get(`/policies/slug/${slug}`);
    return response.data;
  }

  /**
   * Fetch a single policy by ID (Admin)
   */
  async getById(id) {
    const response = await api.get(`/policies/${id}`);
    return response.data;
  }

  /**
   * Create a new policy (Admin only)
   */
  async create(policyData) {
    const response = await api.post('/policies', policyData);
    return response.data;
  }

  /**
   * Update an existing policy (Admin only)
   */
  async update(id, policyData) {
    const response = await api.put(`/policies/${id}`, policyData);
    return response.data;
  }

  /**
   * Delete a policy (Admin only)
   */
  async delete(id) {
    const response = await api.delete(`/policies/${id}`);
    return response.data;
  }
}

export const policyService = new PolicyService();
