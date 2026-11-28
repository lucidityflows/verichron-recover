import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

class ApiClient {
  private instance: AxiosInstance;
  private authToken: string | null = null;

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      timeout: 30000,
      withCredentials: true, // Enable sending/receiving cookies for auth flow
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - inject auth token
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.authToken && config.headers) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors globally
    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - could emit event for logout
          this.clearAuth();
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }

        if (error.response?.status === 403) {
          console.error('Forbidden access');
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth management
  public setAuthToken(token: string): void {
    this.authToken = token;
    // Optionally persist to localStorage
    localStorage.setItem('auth_token', token);
  }

  public clearAuth(): void {
    this.authToken = null;
    localStorage.removeItem('auth_token');
  }

  public loadAuthFromStorage(): void {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.authToken = token;
    }
  }

  // Expose the axios instance
  public getAxios(): AxiosInstance {
    return this.instance;
  }

  // Expose the generic request method
  public request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.request(config);
  }

  // Optional: Add convenience methods
  public async get<T>(url: string, config = {}) {
    return this.instance.get<T>(url, config);
  }

  public async post<T>(url: string, data?: any, config = {}) {
    return this.instance.post<T>(url, data, config);
  }

  public async put<T>(url: string, data?: any, config = {}) {
    return this.instance.put<T>(url, data, config);
  }

  public async patch<T>(url: string, data?: any, config = {}) {
    return this.instance.patch<T>(url, data, config);
  }

  public async delete<T>(url: string, config = {}) {
    return this.instance.delete<T>(url, config);
  }
}

export default ApiClient;