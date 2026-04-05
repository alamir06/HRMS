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

export const employeeService = {
  // CRUDS
  getAllEmployees: async (page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC', filters = {}) => {
    const params = new URLSearchParams({ page, limit, sortBy, sortOrder });
    if (search) params.append('search', search);

    // Append any dynamic filters (like employmentStatus, employeeType)
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });

    return handleResponse(() => api.get(`/employees?${params.toString()}`));
  },

  getEmployeeById: async (id, includes = []) => {
    const params = new URLSearchParams();
    if (includes.length > 0) {
      params.append('include', includes.join(','));
    }
    return handleResponse(() => api.get(`/employees/${id}?${params.toString()}`));
  },

  createEmployee: async (employeeData) => {
    return handleResponse(() => api.post('/employees', employeeData));
  },

  updateEmployee: async (id, employeeData) => {
    return handleResponse(() => api.put(`/employees/${id}`, employeeData));
  },

  deleteEmployee: async (id) => {
    return handleResponse(() => api.delete(`/employees/${id}`));
  },

  // MEDIA & FILE UPLOADS
  uploadProfilePicture: async (id, file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    // Explicitly set headers for multipart
    return handleResponse(() => api.post(`/employees/${id}/profile-picture`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }));
  },

  deleteProfilePicture: async (id) => {
    return handleResponse(() => api.delete(`/employees/${id}/profile-picture`));
  },

  // DOCUMENTS
  uploadSingleDocument: async (id, formData) => {
    return handleResponse(() => api.post(`/employees/${id}/documents`, formData, {
       headers: { 'Content-Type': 'multipart/form-data' }
    }));
  },

  getDocuments: async (id) => {
    return handleResponse(() => api.get(`/employees/${id}/documents`));
  },
  
  deleteDocument: async (documentId) => {
    return handleResponse(() => api.delete(`/employees/documents/${documentId}`));
  }
};
