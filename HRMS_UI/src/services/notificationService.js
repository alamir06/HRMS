import axios from 'axios';

const API_URL = 'http://localhost:5000/api/notifications';

const getAuthHeaders = () => {
  const token = (localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken'));
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

export const notificationService = {
  // Get user notifications
  getUserNotifications: async (userId, params = {}) => {
    try {
      const response = await axios.get(`${API_URL}/user/${userId}`, {
        ...getAuthHeaders(),
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Mark single notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await axios.patch(`${API_URL}/${notificationId}/read`, { isRead: true }, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Mark all notifications as read for user
  markAllAsRead: async (userId) => {
    try {
      const response = await axios.patch(`${API_URL}/user/${userId}/read`, { markAll: true, isRead: true }, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
};
