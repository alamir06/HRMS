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

  /**
   * Request password reset email
   * @param {string} email - User email address
   * @returns {Promise<Object>} API response data
   */
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password with token
   * @param {Object} data - { token, newPassword, confirmPassword }
   * @returns {Promise<Object>} API response data
   */
  resetPassword: async (data) => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },
};
