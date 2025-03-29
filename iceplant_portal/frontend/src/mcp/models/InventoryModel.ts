import { BaseModel } from './BaseModel';

export interface InventoryItem extends BaseModel {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  category: string;
  lastRestocked?: Date;
  minStockLevel?: number;
} 