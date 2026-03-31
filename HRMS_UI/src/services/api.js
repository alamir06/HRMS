import axios from 'axios';

// Base API instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // Typical JWT Bearer pattern
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
    // Check if unauthorized, e.g., token expired
    if (error.response && error.response.status === 401) {
      // Possibly clear local storage and redirect to login, handled via context or router ideally
      localStorage.removeItem('adminToken');
      // window.location.href = '/login'; // Optional: Redirect forcibly
    }
    return Promise.reject(error);
  }
);

export default api;
