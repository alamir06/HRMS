import api from './api';

const handleResponse = async (apiCall) => {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      return error.response.data;
    }
    return { success: false, message: error.message || 'An unexpected error occurred' };
  }
};

export const assetService = {
  // --- Category APIs ---
  getAllCategories: async (page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC') => {
    return handleResponse(() => api.get('/assets/categories', {
      params: { page, limit, search, sortBy, sortOrder }
    }));
  },

  createCategory: async (categoryData) => {
    return handleResponse(() => api.post('/assets/categories', categoryData));
  },

  updateCategory: async (id, categoryData) => {
    return handleResponse(() => api.put(`/assets/categories/${id}`, categoryData));
  },

  deleteCategory: async (id) => {
    return handleResponse(() => api.delete(`/assets/categories/${id}`));
  },

  // --- Asset Items APIs ---
  getAllAssets: async (page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC') => {
    return handleResponse(() => api.get('/assets/items', {
      params: { page, limit, search, sortBy, sortOrder }
    }));
  },

  getAvailableAssets: async () => {
    return handleResponse(() => api.get('/assets/items/available'));
  },

  getAssetSummary: async (id) => {
    return handleResponse(() => api.get(`/assets/items/${id}/summary`));
  },

  createAsset: async (assetData) => {
    return handleResponse(() => api.post('/assets/items', assetData));
  },

  updateAsset: async (id, assetData) => {
    return handleResponse(() => api.put(`/assets/items/${id}`, assetData));
  },

  deleteAsset: async (id) => {
    return handleResponse(() => api.delete(`/assets/items/${id}`));
  },

  // --- Assignment APIs ---
  getAllAssignments: async (page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC') => {
    return handleResponse(() => api.get('/assets/assignments', {
      params: { page, limit, search, sortBy, sortOrder }
    }));
  },

  assignAsset: async (assignmentData) => {
    return handleResponse(() => api.post('/assets/assignments/assign', assignmentData));
  },

  returnAsset: async (id, returnData) => {
    return handleResponse(() => api.post(`/assets/assignments/${id}/return`, returnData));
  },

  getEmployeeAssets: async (employeeId) => {
    return handleResponse(() => api.get(`/assets/employees/${employeeId}/assets`));
  }
};
