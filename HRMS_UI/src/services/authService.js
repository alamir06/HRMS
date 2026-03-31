import api from './api';

export const authService = {
  /**
   * Login user
   * @param {Object} credentials - { identifier, password }
   * @returns {Promise<Object>} API response data
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Change password
   * @param {Object} data - { currentPassword, newPassword, confirmPassword }
   * @returns {Promise<Object>} API response data
   */
  changePassword: async (data) => {
    const response = await api.patch('/auth/change-password', data);
    return response.data;
  },
};
