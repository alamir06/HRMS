import api from './api';

export const recruitmentService = {
  // Get all recruitments
  listRecruitment: async () => {
    try {
      const response = await api.get('/recruitment');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch recruitments' };
    }
  },

  // Get a single recruitment by ID
  getRecruitmentById: async (id) => {
    try {
      const response = await api.get(`/recruitment/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch recruitment details' };
    }
  },

  // Create a single or bulk recruitment array
  createRecruitment: async (payload) => {
    try {
      const response = await api.post('/recruitment', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create recruitment' };
    }
  },

  // Update a recruitment
  updateRecruitment: async (id, data) => {
    try {
      const response = await api.put(`/recruitment/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update recruitment' };
    }
  },

  // Delete a recruitment
  deleteRecruitment: async (id) => {
    try {
      const response = await api.delete(`/recruitment/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete recruitment' };
    }
  }
};
