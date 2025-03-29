/**
 * API service for making authenticated requests to the backend
 */
export class ApiService {
  private static instance: ApiService;
  private baseUrl: string;
  private maxRetries = 3;
  private retryDelay = 1000; // ms
  
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
   * Configure retry settings
   */
  public configureRetry(maxRetries: number, retryDelay: number): void {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
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
   * Sleep function for delay between retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format error response for better logging and debugging
   */
  private formatErrorResponse(error: unknown, endpoint: string, method: string): Error {
    let errorMessage = 'Unknown API error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }
    
    // Log detailed error information
    console.error(`[API ERROR] ${method} ${endpoint}: ${errorMessage}`, {
      endpoint,
      method,
      timestamp: new Date().toISOString(),
      error
    });
    
    return new Error(`API Error (${method} ${endpoint}): ${errorMessage}`);
  }
  
  /**
   * Handle API response and errors
   */
  private async handleResponse<T>(response: Response, endpoint: string, method: string): Promise<T> {
    if (!response.ok) {
      // If 401 unauthorized, attempt to handle token expiration
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        // Dispatch an event that can be listened to for session expiration handling
        window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
        // Redirect to login page
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
      
      // Try to parse error response
      try {
        const errorData = await response.json();
        const errorMessage = errorData.detail || errorData.message || 
                             (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
        throw new Error(errorMessage);
      } catch (e) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    }
    
    // If response is successful but empty (e.g., for DELETE requests)
    if (response.status === 204) {
      return {} as T;
    }
    
    try {
      return await response.json() as T;
    } catch (error) {
      throw this.formatErrorResponse(
        error, 
        endpoint, 
        method
      );
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    fetchFn: () => Promise<Response>,
    endpoint: string,
    method: string
  ): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // If not the first attempt, wait before retrying
        if (attempt > 0) {
          const delayTime = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(`Retry attempt ${attempt} for ${method} ${endpoint} after ${delayTime}ms delay`);
          await this.sleep(delayTime);
        }
        
        const response = await fetchFn();
        return await this.handleResponse<T>(response, endpoint, method);
      } catch (error) {
        lastError = error;
        
        // Don't retry for certain errors (auth errors, invalid requests)
        if (error instanceof Error && 
           (error.message.includes('Session expired') || 
            (error instanceof Response && [400, 401, 403].includes(error.status)))) {
          break;
        }
        
        // If it's the last attempt, don't log "will retry" message
        if (attempt < this.maxRetries - 1) {
          console.warn(`Request failed (attempt ${attempt + 1}/${this.maxRetries}), will retry: ${method} ${endpoint}`);
        }
      }
    }
    
    // If we get here, all retries failed
    throw this.formatErrorResponse(lastError, endpoint, method);
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

    console.info('[INFO] API Request', {
      method: 'GET',
      url: url.toString(),
      params
    });
    
    return this.executeWithRetry<T>(
      () => fetch(url.toString(), {
        method: 'GET',
        headers: this.getAuthHeader(),
        credentials: 'include',
      }),
      endpoint,
      'GET'
    );
  }
  
  /**
   * Perform a POST request
   */
  public async post<T>(endpoint: string, data: any): Promise<T> {
    console.info('[INFO] API Request', {
      method: 'POST',
      url: this.baseUrl + endpoint,
      data
    });
    
    return this.executeWithRetry<T>(
      () => fetch(this.baseUrl + endpoint, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
        credentials: 'include',
      }),
      endpoint,
      'POST'
    );
  }
  
  /**
   * Perform a PATCH request
   */
  public async patch<T>(endpoint: string, data: any): Promise<T> {
    console.info('[INFO] API Request', {
      method: 'PATCH',
      url: this.baseUrl + endpoint,
      data
    });
    
    return this.executeWithRetry<T>(
      () => fetch(this.baseUrl + endpoint, {
        method: 'PATCH',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
        credentials: 'include',
      }),
      endpoint,
      'PATCH'
    );
  }
  
  /**
   * Perform a PUT request
   */
  public async put<T>(endpoint: string, data: any): Promise<T> {
    console.info('[INFO] API Request', {
      method: 'PUT',
      url: this.baseUrl + endpoint,
      data
    });
    
    return this.executeWithRetry<T>(
      () => fetch(this.baseUrl + endpoint, {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
        credentials: 'include',
      }),
      endpoint,
      'PUT'
    );
  }
  
  /**
   * Perform a DELETE request
   */
  public async delete<T>(endpoint: string): Promise<T> {
    console.info('[INFO] API Request', {
      method: 'DELETE',
      url: this.baseUrl + endpoint
    });
    
    return this.executeWithRetry<T>(
      () => fetch(this.baseUrl + endpoint, {
        method: 'DELETE',
        headers: this.getAuthHeader(),
        credentials: 'include',
      }),
      endpoint,
      'DELETE'
    );
  }
  
  /**
   * Login with credentials
   */
  public async login(username: string, password: string): Promise<{ token: string }> {
    console.info('[INFO] Login attempt', { username });
    
    try {
      const response = await fetch(this.baseUrl + 'token-auth/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await this.handleResponse<{ token: string }>(response, 'token-auth/', 'POST');
      localStorage.setItem('authToken', data.token);
      return data;
    } catch (error) {
      console.error('[ERROR] Login error', error);
      throw error;
    }
  }
  
  /**
   * Logout user
   */
  public logout(): void {
    localStorage.removeItem('authToken');
    // Dispatch an event that can be listened to for logout handling
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }
  
  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }
} 