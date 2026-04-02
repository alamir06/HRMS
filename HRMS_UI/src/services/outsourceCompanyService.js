import api from './api';

export const outsourceCompanyService = {
  getAllCompanies: async (page = 1, limit = 100) => {
    const params = new URLSearchParams({ page, limit });
    // Assuming backend generic CRUD applies
    const response = await api.get(`/outsourcing-companies?${params.toString()}`);
    return response.data;
  }
};
