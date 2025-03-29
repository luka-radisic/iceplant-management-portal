/**
 * BaseModel interface that all models should implement
 */
export interface BaseModel {
  id: string | number;
  createdAt?: Date;
  updatedAt?: Date;
} 