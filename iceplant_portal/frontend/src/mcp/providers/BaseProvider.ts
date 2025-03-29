import { BaseModel } from '../models/BaseModel';
import { BaseController } from '../controllers/BaseController';
import { create } from 'zustand';

export interface BaseState<T extends BaseModel> {
  items: T[];
  isLoading: boolean;
  error: string | null;
  selectedItem: T | null;
}

export interface BaseActions<T extends BaseModel> {
  fetchAll: () => Promise<void>;
  fetchById: (id: string | number) => Promise<void>;
  create: (item: Omit<T, 'id'>) => Promise<void>;
  update: (id: string | number, item: Partial<T>) => Promise<void>;
  delete: (id: string | number) => Promise<void>;
  setSelectedItem: (item: T | null) => void;
}

export type BaseStore<T extends BaseModel> = BaseState<T> & BaseActions<T>;

/**
 * Creates a base provider store using Zustand
 * @param controller The controller to use for API calls
 * @returns A Zustand store with CRUD operations
 */
export const createBaseProvider = <T extends BaseModel>(
  controller: BaseController<T>
) => {
  return create<BaseStore<T>>((set, get) => ({
    // Initial state
    items: [],
    isLoading: false,
    error: null,
    selectedItem: null,
    
    // Actions
    fetchAll: async () => {
      set({ isLoading: true, error: null });
      try {
        const items = await controller.getAll();
        set({ items, isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Unknown error occurred', 
          isLoading: false 
        });
      }
    },
    
    fetchById: async (id) => {
      set({ isLoading: true, error: null });
      try {
        const item = await controller.getById(id);
        set({ selectedItem: item, isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Unknown error occurred', 
          isLoading: false 
        });
      }
    },
    
    create: async (item) => {
      set({ isLoading: true, error: null });
      try {
        const newItem = await controller.create(item);
        set(state => ({ 
          items: [...state.items, newItem],
          isLoading: false 
        }));
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Unknown error occurred', 
          isLoading: false 
        });
      }
    },
    
    update: async (id, item) => {
      set({ isLoading: true, error: null });
      try {
        const updatedItem = await controller.update(id, item);
        set(state => ({ 
          items: state.items.map(i => i.id === id ? updatedItem : i),
          selectedItem: get().selectedItem?.id === id ? updatedItem : get().selectedItem,
          isLoading: false 
        }));
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Unknown error occurred', 
          isLoading: false 
        });
      }
    },
    
    delete: async (id) => {
      set({ isLoading: true, error: null });
      try {
        await controller.delete(id);
        set(state => ({ 
          items: state.items.filter(i => i.id !== id),
          selectedItem: get().selectedItem?.id === id ? null : get().selectedItem,
          isLoading: false 
        }));
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Unknown error occurred', 
          isLoading: false 
        });
      }
    },
    
    setSelectedItem: (item) => {
      set({ selectedItem: item });
    },
  }));
}; 