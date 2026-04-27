import api from './api';

export const noticeService = {
  createNotice: async (data) => {
    try {
      const response = await api.post('/notices', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create notice' };
    }
  },

  listNotices: async (filters = {}) => {
    try {
      const response = await api.get('/notices', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch notices' };
    }
  },

  updateNotice: async (id, data) => {
    try {
      const response = await api.patch(`/notices/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update notice' };
    }
  },

  publishNotice: async (id, data) => {
    try {
      const response = await api.patch(`/notices/${id}/publish`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to publish notice' };
    }
  },

  deleteNotice: async (id) => {
    try {
      const response = await api.delete(`/notices/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete notice' };
    }
  }
};
