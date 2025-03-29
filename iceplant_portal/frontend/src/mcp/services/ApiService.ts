/**
 * API service for making authenticated requests to the backend
 */
export class ApiService {
  private static instance: ApiService;
  private baseUrl: string;
  
  private constructor() {
    this.baseUrl = 'http://localhost:8000/api/';
  }
  
  /**
   * Get the singleton instance of ApiService
   */
  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }
  
  /**
   * Get the authorization header with token
   */
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Token ${token}` }),
    };
  }
  
  /**
   * Handle API response and errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // If 401 unauthorized, attempt to handle token expiration
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        // Redirect to login page
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
      
      // Try to parse error response
      try {
        const errorData = await response.json();
        const errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        throw new Error(errorMessage);
      } catch (e) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    }
    
    // If response is successful but empty (e.g., for DELETE requests)
    if (response.status === 204) {
      return {} as T;
    }
    
    return await response.json() as T;
  }
  
  /**
   * Perform a GET request
   */
  public async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(this.baseUrl + endpoint);
    
    // Add query parameters if provided
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeader(),
    });
    
    return this.handleResponse<T>(response);
  }
  
  /**
   * Perform a POST request
   */
  public async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    
    return this.handleResponse<T>(response);
  }
  
  /**
   * Perform a PATCH request
   */
  public async patch<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    
    return this.handleResponse<T>(response);
  }
  
  /**
   * Perform a PUT request
   */
  public async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });
    
    return this.handleResponse<T>(response);
  }
  
  /**
   * Perform a DELETE request
   */
  public async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });
    
    return this.handleResponse<T>(response);
  }
  
  /**
   * Login with credentials
   */
  public async login(username: string, password: string): Promise<{ token: string }> {
    const response = await fetch(this.baseUrl + 'token-auth/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await this.handleResponse<{ token: string }>(response);
    localStorage.setItem('authToken', data.token);
    return data;
  }
  
  /**
   * Logout user
   */
  public logout(): void {
    localStorage.removeItem('authToken');
  }
  
  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }
} 