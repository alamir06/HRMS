import api from './api';

export const outsourceCompanyService = {
  getAllCompanies: async (page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC') => {
    const params = new URLSearchParams({ page, limit, sortBy, sortOrder });
    if (search) {
      params.append('search', search);
    }
    const response = await api.get(`/outsourcing-companies?${params.toString()}`);
    return response.data;
  },

  createCompany: async (companyData) => {
    const response = await api.post('/outsourcing-companies', companyData);
    return response.data;
  },

  updateCompany: async (id, companyData) => {
    const response = await api.patch(`/outsourcing-companies/${id}`, companyData);
    return response.data;
  },

  deleteCompany: async (id) => {
    const response = await api.delete(`/outsourcing-companies/${id}`);
    return response.data;
  }
};

