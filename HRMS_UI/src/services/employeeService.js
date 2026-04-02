import api from './api';

export const employeeService = {
  // CRUDS
  getAllEmployees: async (page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC', filters = {}) => {
    const params = new URLSearchParams({ page, limit, sortBy, sortOrder });
    if (search) params.append('search', search);

    // Append any dynamic filters (like employmentStatus, employeeType)
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });

    const response = await api.get(`/employees?${params.toString()}`);
    return response.data;
  },

  getEmployeeById: async (id, includes = []) => {
    const params = new URLSearchParams();
    if (includes.length > 0) {
      params.append('include', includes.join(','));
    }
    const response = await api.get(`/employees/${id}?${params.toString()}`);
    return response.data;
  },

  createEmployee: async (employeeData) => {
    const response = await api.post('/employees', employeeData);
    return response.data;
  },

  updateEmployee: async (id, employeeData) => {
    const response = await api.put(`/employees/${id}`, employeeData);
    return response.data;
  },

  // MEDIA & FILE UPLOADS
  uploadProfilePicture: async (id, file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    // Explicitly set headers for multipart
    const response = await api.post(`/employees/${id}/profile-picture`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteProfilePicture: async (id) => {
    const response = await api.delete(`/employees/${id}/profile-picture`);
    return response.data;
  },

  // DOCUMENTS
  uploadSingleDocument: async (id, formData) => {
    const response = await api.post(`/employees/${id}/documents`, formData, {
       headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getDocuments: async (id) => {
    const response = await api.get(`/employees/${id}/documents`);
    return response.data;
  },
  
  deleteDocument: async (documentId) => {
    const response = await api.delete(`/employees/documents/${documentId}`);
    return response.data;
  }
};
