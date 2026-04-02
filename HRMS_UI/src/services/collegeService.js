import api from './api';

export const collegeService = {
  /**
   * Fetch paginated and optionally filtered colleges
   */
  getAllColleges: async (page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC') => {
    const params = new URLSearchParams({ page, limit, sortBy, sortOrder });
    if (search) {
      params.append('search', search);
    }
    const response = await api.get(`/colleges?${params.toString()}`);
    return response.data; // Resolves body.data since axios handles the wrapping json
  },

  /**
   * Get global stats for college metrics
   */
  getDashboardStats: async () => {
    const response = await api.get('/colleges/stats/dashboard');
    return response.data;
  },

  /**
   * Create a new college
   */
  createCollege: async (collegeData) => {
    const response = await api.post('/colleges', collegeData);
    return response.data;
  },

  /**
   * Update an existing college
   */
  updateCollege: async (id, collegeData) => {
    const response = await api.patch(`/colleges/${id}`, collegeData);
    return response.data;
  },

  /**
   * Delete a college
   */
  deleteCollege: async (id) => {
    const response = await api.delete(`/colleges/${id}`);
    return response.data;
  }
};
