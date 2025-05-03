import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',       // ← EVERY call is /api/whatever
  timeout: 10000,
  withCredentials: true, // if you rely on cookies
});

// Add a request interceptor to attach the auth token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default apiClient;
