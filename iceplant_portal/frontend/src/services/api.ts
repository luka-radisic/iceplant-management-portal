import axios from 'axios';
import { loggerService } from '../utils/logger';

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
    // Skip adding token for login requests
    if (token && !config.url?.includes('/api-token-auth/')) {
      config.headers.Authorization = `Token ${token}`;
    }
    loggerService.info('API Request', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      params: config.params,
    });
    return config;
  },
  (error) => {
    loggerService.error('API Request Error', {
      error: error.toString(),
      details: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    loggerService.info('API Response', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    loggerService.error('API Error', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
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

  // Employee Profile
  employeeProfileDepartments: '/api/attendance/employee-profile/departments/',
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

  async getEmployeeProfile(employeeId: string) {
    return this.get(`/api/attendance/employee-profile/${employeeId}/`);
  },

  async uploadEmployeePhoto(employeeId: string, photoFile: File) {
    const formData = new FormData();
    formData.append('photo', photoFile);

    const response = await api.post(
      `/api/attendance/employee-profile/${employeeId}/upload_photo/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  async removeEmployeePhoto(employeeId: string) {
    return this.delete(`/api/attendance/employee-profile/${employeeId}/remove_photo/`);
  },

  async updateEmployeeProfile(employeeId: string, data: any) {
    return this.put(`/api/attendance/employee-profile/${employeeId}/`, data);
  },

  async getDepartments() {
    return this.get(endpoints.employeeProfileDepartments);
  },
};

export default apiService; 