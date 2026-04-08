import api from './api';

export const leaveService = {
  getMyLeaves: async (params) => {
    const response = await api.get('/leave/mine', { params });
    return response.data;
  },
  
  getAllLeaveRequests: async (params) => {
    const response = await api.get('/leave/all', { params });
    return response.data;
  },
  
  requestLeave: async (data) => {
    const isFormData = data instanceof FormData;
    const response = await api.post('/leave/request', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
  },
  
  approveLeave: async (id, data) => {
    const response = await api.put(`/leave/${id}/approve`, data);
    return response.data;
  },
  
  rejectLeave: async (id, data) => {
    const response = await api.put(`/leave/${id}/reject`, data);
    return response.data;
  }
};
