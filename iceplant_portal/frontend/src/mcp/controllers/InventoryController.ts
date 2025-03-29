import { BaseController } from './BaseController';
import { InventoryItem } from '../models/InventoryModel';

export class InventoryController extends BaseController<InventoryItem> {
  endpoint = 'inventory/items/';
  
  /**
   * Get inventory items by category
   */
  async getByCategory(category: string): Promise<InventoryItem[]> {
    try {
      return await this.apiService.get<InventoryItem[]>(this.endpoint, { category });
    } catch (error) {
      console.error(`Error fetching items with category ${category}:`, error);
      throw error;
    }
  }
  
  /**
   * Get low stock items (below minimum stock level)
   */
  async getLowStockItems(): Promise<InventoryItem[]> {
    try {
      return await this.apiService.get<InventoryItem[]>(`${this.endpoint}low-stock/`);
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      throw error;
    }
  }
  
  /**
   * Update stock quantity
   */
  async updateStock(id: string | number, quantity: number): Promise<InventoryItem> {
    try {
      return await this.apiService.patch<InventoryItem>(`${this.endpoint}${id}/update-stock/`, { quantity });
    } catch (error) {
      console.error(`Error updating stock for item ${id}:`, error);
      throw error;
    }
  }
} 