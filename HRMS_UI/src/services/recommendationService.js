import api from './api';

export const recommendationService = {
  createRequest: async (data) => {
    const response = await api.post('/recommendations', data);
    return response.data;
  },

  getAllRequests: async (params) => {
    const response = await api.get('/recommendations', { params });
    return response.data;
  },

  getRequestById: async (id) => {
    const response = await api.get(`/recommendations/${id}`);
    return response.data;
  },

  updateStatus: async (id, status, rejectionReason = '', additionalExperience = '') => {
    const response = await api.patch(`/recommendations/${id}/status`, { status, rejectionReason, additionalExperience });
    return response.data;
  }
};
