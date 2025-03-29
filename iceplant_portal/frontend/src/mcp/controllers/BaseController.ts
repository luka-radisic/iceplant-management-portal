import { BaseModel } from '../models/BaseModel';
import { ApiService } from '../services/ApiService';

/**
 * BaseController abstract class that all controllers should extend
 * Provides common CRUD operations for models
 */
export abstract class BaseController<T extends BaseModel> {
  protected apiService: ApiService;
  abstract endpoint: string;
  
  constructor() {
    this.apiService = ApiService.getInstance();
  }
  
  /**
   * Get all items
   */
  async getAll(): Promise<T[]> {
    try {
      return await this.apiService.get<T[]>(this.endpoint);
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }
  
  /**
   * Get single item by id
   */
  async getById(id: string | number): Promise<T> {
    try {
      return await this.apiService.get<T>(`${this.endpoint}${id}/`);
    } catch (error) {
      console.error(`Error fetching item with id ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Create a new item
   */
  async create(item: Omit<T, 'id'>): Promise<T> {
    try {
      return await this.apiService.post<T>(this.endpoint, item);
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing item
   */
  async update(id: string | number, item: Partial<T>): Promise<T> {
    try {
      return await this.apiService.patch<T>(`${this.endpoint}${id}/`, item);
    } catch (error) {
      console.error(`Error updating item with id ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete an item
   */
  async delete(id: string | number): Promise<void> {
    try {
      await this.apiService.delete<void>(`${this.endpoint}${id}/`);
    } catch (error) {
      console.error(`Error deleting item with id ${id}:`, error);
      throw error;
    }
  }
} 