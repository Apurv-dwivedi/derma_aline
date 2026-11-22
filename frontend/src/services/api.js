import axios from 'axios';

// Use environment variable for production, fallback to live Render backend for development/production safety
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://derma-aline.onrender.com/api',
});

// Intercept requests to attach the JWT token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept responses to handle 401 Unauthorized (Expired Token)
API.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    const requestUrl = error.config?.url || '';
    const isAuthAttempt = requestUrl.includes('/auth/login') || requestUrl.includes('/login');

    // Never redirect if the failing request is the authentication request itself,
    // so the UI can display the error message instead of refreshing the page
    if (!isAuthAttempt) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('fullName');

      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/admin') || currentPath.startsWith('/owner')) {
        window.location.href = '/owner/login';
      } else if (currentPath.startsWith('/staff')) {
        window.location.href = '/staff/login';
      } else if (currentPath.startsWith('/client')) {
        window.location.href = '/client/login';
      }
    }
  }
  return Promise.reject(error);
});

export default API;