import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      params: config.params,
    });
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Auth
  login: '/api-token-auth/',
  
  // Attendance
  attendance: '/api/attendance/attendance/',
  importAttendance: '/api/attendance/attendance/import_xlsx/',
  importLogs: '/api/attendance/import-logs/',
  
  // Sales
  sales: '/api/sales/sales/',
  salesSummary: '/api/sales/sales/summary/',
  
  // Inventory
  inventory: '/api/inventory/inventory/',
  inventoryAdjustments: '/api/inventory/inventory-adjustments/',
  lowStock: '/api/inventory/inventory/low_stock/',
  
  // Expenses
  expenses: '/api/expenses/expenses/',
  expensesSummary: '/api/expenses/expenses/summary/',
};

// Generic API functions
export const apiService = {
  // Auth
  login: async (username: string, password: string) => {
    const response = await api.post(endpoints.login, { username, password });
    const { token } = response.data;
    localStorage.setItem('token', token);
    return response.data;
  },

  // GET requests
  get: async (endpoint: string, params?: any) => {
    try {
      const response = await api.get(endpoint, { params });
      return response.data;
    } catch (error) {
      console.error('GET request failed:', error);
      throw error;
    }
  },

  // POST requests
  post: async (endpoint: string, data: any) => {
    try {
      const response = await api.post(endpoint, data);
      return response.data;
    } catch (error) {
      console.error('POST request failed:', error);
      throw error;
    }
  },

  // PUT requests
  put: async (endpoint: string, data: any) => {
    try {
      const response = await api.put(endpoint, data);
      return response.data;
    } catch (error) {
      console.error('PUT request failed:', error);
      throw error;
    }
  },

  // DELETE requests
  delete: async (endpoint: string) => {
    try {
      const response = await api.delete(endpoint);
      return response.data;
    } catch (error) {
      console.error('DELETE request failed:', error);
      throw error;
    }
  },

  // File upload
  upload: async (endpoint: string, file: File, additionalData?: any) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (additionalData) {
        Object.keys(additionalData).forEach(key => {
          formData.append(key, additionalData[key]);
        });
      }
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  },
};

export default apiService; 