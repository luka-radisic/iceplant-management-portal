import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',       // ← EVERY call is /api/whatever
  timeout: 10000,
  withCredentials: true, // if you rely on cookies
});

// Example: you can add interceptors here to attach auth tokens, etc.
// apiClient.interceptors.request.use(config => { ... })

export default apiClient;
