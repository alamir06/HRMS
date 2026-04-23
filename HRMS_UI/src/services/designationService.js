import api from './api';

const designationService = {
  createDesignation: async (designationData) => {
    try {
      const response = await api.post('/designations', designationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getDesignations: async (params) => {
    try {
      const response = await api.get('/designations', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getDesignationStats: async () => {
    try {
      const response = await api.get('/designations/stats');
      return response.data;
    } catch (error) {
       throw error;
    }
  }
};

export default designationService;
