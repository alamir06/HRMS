import api from './api';

export const benefitService = {
  getAllBenefits: async (page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC') => {
    const params = new URLSearchParams({ page, limit, sortBy, sortOrder });
    if (search) {
      params.append('search', search);
    }
    const response = await api.get(`/benefits/catalog?${params.toString()}`);
    return response.data;
  },

  createBenefit: async (benefitData) => {
    const response = await api.post('/benefits/catalog', benefitData);
    return response.data;
  },

  updateBenefit: async (id, benefitData) => {
    const response = await api.patch(`/benefits/catalog/${id}`, benefitData);
    return response.data;
  },

  deleteBenefit: async (id) => {
    const response = await api.delete(`/benefits/catalog/${id}`);
    return response.data;
  },

  getBenefitSummary: async (id) => {
    const response = await api.get(`/benefits/catalog/${id}/summary`);
    return response.data;
  },

  enrollEmployee: async (payload) => {
    const response = await api.post('/benefits/enrollments/enroll', payload);
    return response.data;
  },

  updateEnrollmentStatus: async (enrollmentId, payload) => {
    const response = await api.post(`/benefits/enrollments/${enrollmentId}/status`, payload);
    return response.data;
  },

  getEmployeeBenefits: async (employeeId, status = '') => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await api.get(`/benefits/employees/${employeeId}${query}`);
    return response.data;
  }
};
