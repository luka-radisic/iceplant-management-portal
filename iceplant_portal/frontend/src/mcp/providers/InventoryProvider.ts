import { create } from 'zustand';
import { InventoryItem } from '../models/InventoryModel';
import { InventoryController } from '../controllers/InventoryController';
import { BaseStore, createBaseProvider } from './BaseProvider';

// Extending the base interfaces with inventory-specific functionality
interface InventoryState {
  lowStockItems: InventoryItem[];
  categories: string[];
  filterCategory: string | null;
  isLoadingLowStock: boolean;
}

interface InventoryActions {
  fetchLowStockItems: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  updateStockQuantity: (id: string | number, quantity: number) => Promise<void>;
  setFilterCategory: (category: string | null) => void;
}

// Combined type for the complete store
type InventoryStore = BaseStore<InventoryItem> & InventoryState & InventoryActions;

// Create and export the inventory store
export const useInventoryStore = create<InventoryStore>((set, get) => {
  // Create the controller
  const controller = new InventoryController();
  
  // Get the base store
  const baseStore = createBaseProvider<InventoryItem>(controller)((set, get) => {});
  
  // Return the combined store with extended functionality
  return {
    // Include all properties and methods from the base store
    ...baseStore((set, get) => {}),
    
    // Additional state
    lowStockItems: [],
    categories: [],
    filterCategory: null,
    isLoadingLowStock: false,
    
    // Additional actions
    fetchLowStockItems: async () => {
      set({ isLoadingLowStock: true });
      try {
        const items = await controller.getLowStockItems();
        set({ lowStockItems: items, isLoadingLowStock: false });
      } catch (error) {
        console.error('Error fetching low stock items:', error);
        set({ isLoadingLowStock: false });
      }
    },
    
    fetchCategories: async () => {
      try {
        // Get all items and extract unique categories
        const items = await controller.getAll();
        const uniqueCategories = [...new Set(items.map(item => item.category))];
        set({ categories: uniqueCategories });
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    },
    
    updateStockQuantity: async (id, quantity) => {
      set({ isLoading: true });
      try {
        const updatedItem = await controller.updateStock(id, quantity);
        
        // Update the item in both regular items and low stock items
        set(state => ({
          items: state.items.map(i => i.id === id ? updatedItem : i),
          lowStockItems: state.lowStockItems.map(i => i.id === id ? updatedItem : i),
          selectedItem: state.selectedItem?.id === id ? updatedItem : state.selectedItem,
          isLoading: false
        }));
      } catch (error) {
        console.error(`Error updating stock quantity for item ${id}:`, error);
        set({ isLoading: false });
      }
    },
    
    setFilterCategory: (category) => {
      set({ filterCategory: category });
    }
  };
}); 