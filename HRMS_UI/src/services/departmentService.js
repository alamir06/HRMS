import api from './api';

export const departmentService = {
  getAllDepartments: async (page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'DESC') => {
    const params = new URLSearchParams({ page, limit, sortBy, sortOrder });
    if (search) {
      params.append('search', search);
    }
    const response = await api.get(`/departments?${params.toString()}`);
    return response.data;
  },

  getAllDepartmentsWithRelations: async () => {
    const response = await api.get('/departments/with-relations/all');
    return response.data;
  },

  getDepartmentsByParent: async (parentId) => {
    const response = await api.get(`/departments/parent/${parentId}`);
    return response.data;
  },

  createDepartment: async (data) => {
    const response = await api.post('/departments', data);
    return response.data;
  },

  updateDepartment: async (id, data) => {
    const response = await api.patch(`/departments/${id}`, data);
    return response.data;
  },

  deleteDepartment: async (id) => {
    const response = await api.delete(`/departments/${id}`);
    return response.data;
  },

  getDepartmentById: async (id) => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  }
};
