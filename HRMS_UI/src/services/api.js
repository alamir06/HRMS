import axios from 'axios';

// Base API instance
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://hrms-6mfv.onrender.com/api';
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = (localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken'));
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Global Errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and user data on 401
      localStorage.removeItem('adminToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('user');
      
      // Only redirect if not already on the login page or making a login request
      if (error.config && !error.config.url.includes('/auth/login') && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
