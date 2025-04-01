import axios from 'axios';
import { loggerService } from '../utils/logger';

// Change from static URL to a dynamic URL that will work in all environments
const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout and withCredentials settings
  timeout: 60000, // 60 seconds timeout - the huge data might need more time
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    // Skip adding token for login requests
    if (token && !config.url?.includes('/api-token-auth/')) {
      config.headers.Authorization = `Token ${token}`;
    }
    // Log the request for debugging
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      params: config.params,
    });
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
    // Log successful response
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
    });
    loggerService.info('API Response', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    // Log error response
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
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
  // register: '/api/register/', // Removed user management endpoint
  // users: '/api/users/', // Removed user management endpoint

  // Attendance
  attendance: '/api/attendance/attendance/',
  attendanceSummary: '/api/attendance/attendance/summary/',
  importAttendance: '/api/attendance/attendance/import_xlsx/',
  importLogs: '/api/attendance/import-logs/',

  // Sales
  sales: '/api/sales/sales/',
  salesByDate: '/api/sales/by-date/',
  salesSummary: '/api/sales/sales/summary/',

  // Buyers
  buyers: '/api/buyers/buyers/',
  buyersActive: '/api/buyers/buyers/active/',
  buyersSearchOrCreate: '/api/buyers/buyers/search_or_create/',
  buyersById: '/api/buyers/buyers/',

  // Inventory
  inventory: '/api/inventory/inventory/',
  inventoryAdjustments: '/api/inventory/inventory-adjustments/',
  lowStock: '/api/inventory/inventory/low_stock/',

  // Expenses
  expenses: '/api/expenses/expenses/',
  expenseCategories: '/api/expenses/categories/',
  expensesSummary: '/api/expenses/expenses/summary/',
  expensesTotal: '/api/expenses/expenses/total/',

  // Employee Profile
  employeeProfileDepartments: '/api/attendance/employee-profile/departments/',

  // Company
  company: '/api/company/settings/',
  companyLogo: '/api/company/settings/upload_logo/',

  // Tools
  tools: '/api/tools/',
};

// Helper function to trigger file download from blob
const triggerFileDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Generic API functions
export const apiService = {
  // Auth
  login: async (username: string, password: string) => {
    const response = await api.post(endpoints.login, { username, password });
    const { 
      token, 
      user_id, 
      username: userName, 
      email, 
      is_superuser, 
      is_staff, 
      group,
      first_name,
      last_name,
      full_name
    } = response.data;
    
    // Store token in localStorage
    localStorage.setItem('token', token);
    
    // Create user object with all relevant information
    const user = {
      id: user_id,
      username: userName,
      email: email || '',
      is_superuser: is_superuser || false,
      is_staff: is_staff || false,
      group: group || '',
      first_name: first_name || '',
      last_name: last_name || '',
      full_name: full_name || userName
    };
    
    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(user));
    
    return {
      token,
      user
    };
  },

  // User registration - Removed
  /*
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    admin_code?: string;
  }) => {
    const response = await api.post(endpoints.register, userData);
    return response.data;
  },
  */

  // User management (admin only) - Removed
  /*
  getUsers: async () => {
    return apiService.get(endpoints.users);
  },

  getUserById: async (userId: number) => {
    return apiService.get(`${endpoints.users}${userId}/`);
  },

  createUser: async (userData: any) => {
    return apiService.post(endpoints.users, userData);
  },

  updateUser: async (userId: number, userData: any) => {
    return apiService.put(`${endpoints.users}${userId}/`, userData);
  },

  deleteUser: async (userId: number) => {
    return apiService.delete(`${endpoints.users}${userId}/`);
  },
  */

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
  put: async (endpoint: string, data: any, config?: any) => {
    try {
      const response = await api.put(endpoint, data, config);
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

  // Attendance Endpoints
  async processSameDayCheckIns() {
    return this.post('/api/attendance/attendance/process_same_day_records/');
  },

  async cleanupShortDurationAttendance() {
    return this.post('/api/attendance/attendance/cleanup-short-duration/', {});
  },

  async getAttendanceStats(params: any) {
    // Remove empty params before sending
    const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    return this.get('/api/attendance/attendance/stats', filteredParams);
  },

  // Tools Endpoints
  async backupFullDatabase() {
    return this.getFile('/api/tools/tools/backup/full/');
  },
  async backupDepartmentDatabase(department: string) {
    return this.getFile('/api/tools/tools/backup/department/', { department });
  },
  async restoreDatabase(backupFile: File) {
    const formData = new FormData();
    formData.append('backup_file', backupFile);
    
    try {
      const response = await api.post('/api/tools/tools/restore/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error restoring database:', error);
      throw error;
    }
  },

  // ImportLog

  // Generic GET request for file downloads
  getFile: async (endpoint: string, params?: any) => {
    try {
      const response = await api.get(endpoint, { 
        params, 
        responseType: 'blob' // Important: request blob data
      });
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'download.json'; // Default filename
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      
      triggerFileDownload(response.data, filename);

    } catch (error) {
      console.error('GET file request failed:', error);
      // Handle specific error responses if needed
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        // Try to read error message from blob
        const errorText = await error.response.data.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || 'Failed to download file.');
        } catch (parseError) {
          throw new Error(errorText || 'Failed to download file.');
        }
      } else {
         throw error; // Re-throw other errors
      }
    }
  },

  // PATCH requests (useful for partial updates)
  patch: async (endpoint: string, data: any) => {
    try {
      const response = await api.patch(endpoint, data);
      return response.data;
    } catch (error) {
      console.error('PATCH request failed:', error);
      throw error;
    }
  },

  // Specific method for updating sale status
  updateSaleStatus: async (saleId: number, status: 'processed' | 'canceled' | 'error') => {
    const endpoint = `${endpoints.sales}${saleId}/`; // Construct URL like /api/sales/sales/1/
    return apiService.patch(endpoint, { status });
  },

  // Buyer management methods
  getBuyers: async (params?: any) => {
    return apiService.get(endpoints.buyers, params);
  },

  getBuyerById: async (id: string) => {
    return apiService.get(`${endpoints.buyersById}?id=${encodeURIComponent(id)}`);
  },

  getActiveBuyers: async () => {
    return apiService.get(endpoints.buyersActive);
  },
  
  createBuyer: async (buyerData: any) => {
    return apiService.post(endpoints.buyers, buyerData);
  },
  
  updateBuyer: async (buyerId: string, buyerData: any) => {
    return apiService.put(`${endpoints.buyers}${buyerId}/`, buyerData);
  },
  
  searchOrCreateBuyer: async (name: string) => {
    return apiService.get(`${endpoints.buyersSearchOrCreate}?name=${encodeURIComponent(name)}`);
  },

  searchOrCreateBuyerWithId: async (nameOrId: string) => {
    // Check if the input might be a UUID
    const mightBeUuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(nameOrId);
    
    // If it looks like a UUID, try to find by ID first
    if (mightBeUuid) {
      try {
        const buyer = await apiService.getBuyerById(nameOrId);
        return buyer;
      } catch (error) {
        // If no buyer found by ID, continue to search by name
        console.log('No buyer found with ID, will try by name:', nameOrId);
      }
    }
    
    // Search by name (or create if not found)
    return apiService.searchOrCreateBuyer(nameOrId);
  },

  getBuyersById: async (buyerId: string) => {
    return apiService.get(`${endpoints.buyersById}${buyerId}/`);
  },

  // Company methods
  getCompanySettings: async () => {
    return apiService.get(endpoints.company);
  },
  
  updateCompanySettings: async (settings: any) => {
    // If we have an ID, update the existing settings
    if (settings.id) {
      return apiService.put(
        `${endpoints.company}${settings.id}/`, 
        settings,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    // Otherwise create new settings
    return apiService.post(
      endpoints.company,
      settings,
      {
        headers: {
          'Content-Type': 'application/json', 
        },
      }
    );
  },
  
  uploadCompanyLogo: async (logoFile: File) => {
    const formData = new FormData();
    formData.append('company_logo', logoFile);
    
    try {
      const response = await api.post(
        endpoints.companyLogo,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  },
};

export default apiService; 