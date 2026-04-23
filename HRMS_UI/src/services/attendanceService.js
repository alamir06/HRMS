import api from './api';

export const attendanceService = {
  getAllAttendance: async (params) => {
    const response = await api.get('/attendance', { params });
    return response.data;
  },

  createAttendance: async (data) => {
    const response = await api.post('/attendance', data);
    return response.data;
  },

  
  checkIn: async (employeeId, data) => {
    const response = await api.post(`/attendance/employees/${employeeId}/check-in`, data);
    return response.data;
  },
  
  checkOut: async (employeeId, data) => {
    const response = await api.post(`/attendance/employees/${employeeId}/check-out`, data);
    return response.data;
  },

  getEmployeeAttendance: async (employeeId, params) => {
    const response = await api.get(`/attendance/employees/${employeeId}`, { params });
    return response.data;
  },

  getEmployeeSummary: async (employeeId, params) => {
    const response = await api.get(`/attendance/employees/${employeeId}/summary`, { params });
    return response.data;
  }
};
