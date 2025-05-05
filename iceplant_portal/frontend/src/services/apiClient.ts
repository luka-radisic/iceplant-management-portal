import axios from 'axios';

// Use localhost instead of 'backend' hostname which only works inside Docker
const BACKEND_URL = 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BACKEND_URL,  
  timeout: 10000,
  withCredentials: true, // if you rely on cookies
});

// Add request interceptor to handle the auth token
apiClient.interceptors.request.use(config => {
  const userJson = localStorage.getItem('user');
  
  if (userJson) {
    try {
      const userData = JSON.parse(userJson);
      if (userData && userData.token) {
        config.headers.Authorization = `Token ${userData.token}`;
      }
    } catch (e) {
      console.error('Error parsing user data from localStorage:', e);
    }
  }
  
  return config;
}, error => {
  return Promise.reject(error);
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
