import axios from 'axios';
import { clearAuthSession, isJwtTokenValid } from '../utils/authSession';

// Use environment variable for production, fallback to live Render backend for development/production safety
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://derma-aline.onrender.com/api',
});

// Intercept requests to attach a non-expired JWT token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    if (isJwtTokenValid(token)) {
      config.headers.Authorization = "Bearer " + token;
    } else {
      clearAuthSession();
    }
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
    const isAuthAttempt = requestUrl.includes('/auth/login')
      || requestUrl.includes('/auth/internal-login')
      || requestUrl.includes('/auth/sync-supabase-user')
      || requestUrl.includes('/auth/register')
      || requestUrl.includes('/auth/verify-otp')
      || requestUrl.includes('/auth/reset-password')
      || requestUrl.includes('/auth/staff/activate')
      || requestUrl.includes('/login');

    // Never redirect if the failing request is the authentication request itself,
    // so the UI can display the error message instead of refreshing the page
    if (!isAuthAttempt) {
      clearAuthSession();

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

export const performServerLogout = async () => {
  try {
    const token = localStorage.getItem('token');
    if (token && isJwtTokenValid(token)) {
      await API.post('/auth/logout');
    }
  } catch {
    // Clear client state cleanly even if session is already expired or server unreachable
  } finally {
    clearAuthSession();
    localStorage.clear();
  }
};

export default API;