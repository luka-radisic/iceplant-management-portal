# MCP Architecture

The MCP (Model-Controller-Provider) pattern is an architecture for structuring frontend applications, particularly those that interact with backend APIs. It provides a clean separation of concerns and helps manage application state effectively.

## Structure

The MCP architecture consists of three main components:

### 1. Models (M)

Models define the shape of the data used in the application. They are TypeScript interfaces that represent the structure of entities from the backend.

```typescript
// Example: BaseModel.ts
export interface BaseModel {
  id: string | number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Example: InventoryModel.ts
export interface InventoryItem extends BaseModel {
  name: string;
  quantity: number;
  // other properties...
}
```

### 2. Controllers (C)

Controllers handle the communication with the backend API. They encapsulate the logic for fetching, creating, updating, and deleting data.

```typescript
// Example: InventoryController.ts
export class InventoryController extends BaseController<InventoryItem> {
  endpoint = 'inventory/items/';
  
  // Custom methods for specific API endpoints
  async getLowStockItems(): Promise<InventoryItem[]> {
    // Implementation...
  }
}
```

### 3. Providers (P)

Providers manage the application state using Zustand. They combine controllers with state management to provide a unified interface for components to interact with data.

```typescript
// Example: InventoryProvider.ts
export const useInventoryStore = create<InventoryStore>((set, get) => {
  const controller = new InventoryController();
  
  // Return state and actions
  return {
    // State
    items: [],
    isLoading: false,
    
    // Actions
    fetchAll: async () => {
      // Implementation using controller
    }
  };
});
```

## Benefits

1. **Separation of Concerns**: Each part of the architecture has a clear responsibility.
2. **Reusability**: Controllers and models can be reused across different providers and components.
3. **Testability**: The architecture makes it easier to test each component in isolation.
4. **Maintainability**: Changes to one part of the architecture have minimal impact on other parts.
5. **Scalability**: The pattern scales well as the application grows.

## Usage Example

```tsx
// Component using the MCP pattern
function InventoryList() {
  const { items, isLoading, fetchAll } = useInventoryStore();
  
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  
  if (isLoading) return <Loading />;
  
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name} - {item.quantity}</li>
      ))}
    </ul>
  );
}
```

## Folder Structure

```
src/
  mcp/
    models/           # Data interfaces
      BaseModel.ts
      InventoryModel.ts
      ...
    controllers/      # API communication
      BaseController.ts
      InventoryController.ts
      ...
    providers/        # State management
      BaseProvider.ts
      InventoryProvider.ts
      ...
    services/         # Shared services
      ApiService.ts
      ...
    index.ts          # Exports all MCP components
```

## Implementation Notes

- The `BaseController` provides standard CRUD operations that all controllers inherit.
- The `ApiService` handles authentication, error handling, and HTTP requests.
- Providers use Zustand for state management, which provides a simple and effective way to manage application state.
- Each provider extends the base functionality with domain-specific state and actions. 