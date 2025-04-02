# Cursor Project Rules for IcePlant Management Portal

This document outlines specific rules and guidelines to follow when working on the IcePlant Management Portal project within the Cursor IDE.

## General

*   **Knowledge Base:** This file (`.cursor/rules.md`) serves as the primary knowledge base. Refer to it for project context and guidelines. Do not code outside the context provided here and in the established project structure.
*   **Verify Information:** Always verify information from the context or codebase before presenting it. Avoid assumptions.
*   **No Inventions:** Implement only what is explicitly requested.
*   **Preserve Existing Code:** Do not remove unrelated code or functionalities.

## Feature Development

*   **(If Applicable) Follow `implementation-plan.mdc`:** When implementing features outlined in an `implementation-plan.mdc`, strictly follow the defined steps and update the plan after each step.

## Development Workflow

*   **File-by-File Changes:** Make changes one file at a time to allow for easier review.
*   **Terminal Usage:**
    *   **Check Existing Servers:** **ALWAYS** check active terminal windows to see if development servers (backend/frontend) are already running before starting new ones.
    *   **Use Scripts:** Prioritize using the `start.sh` and `stop.sh` scripts located in the project root for managing development servers over raw commands like `python manage.py runserver` or `npm start`.
    *   **Reuse Shells:** Utilize existing terminal shell sessions when possible, being mindful of the current working directory.
*   **Troubleshooting & Debugging:**
    *   **Prioritize MCP Tools:** **ALWAYS** use the integrated MCP browser tools (Console Logs, Network Logs, Errors, Element Inspector, Audits) for frontend troubleshooting and debugging *before* resorting to manual browser inspection or adding extensive console logs in the code. Wipe logs between tests using MCP tools when appropriate.
*   **Commits:** Make clear and concise commit messages describing the changes.

## Code Style & Quality

*   **Consistency:** Adhere to the existing coding style (Python/Django backend, TypeScript/React frontend).
*   **Variable Names:** Use descriptive and explicit variable names.
*   **Dependencies:** Keep dependency files (`requirements.txt`, `package.json`) up-to-date.
*   **Error Handling:** Implement robust error handling where necessary.
*   **Testing:** Add relevant tests for new or modified functionality.

## Communication

*   **Clarity:** Be clear and direct.
*   **No Apologies:** Avoid apologies.
*   **No Unnecessary Summaries/Confirmations:** Do not provide summaries unless asked or confirmations for information already available.
*   **Provide Real File Links:** Use relative links to project files.

## API Guidelines (Django REST Framework)

*   **URL Structure:** Use versioned, kebab-case URLs: `/api/v1/<app_label>/<model_name_plural>/` (e.g., `/api/v1/maintenance/maintenance-items/`).
*   **Views:** Prefer `ModelViewSet` for standard CRUD operations on models.
*   **Serializers:** Define serializers in `<app_label>/serializers.py`. Use `ModelSerializer` and clearly define readable/writable fields.
*   **Permissions:** Implement appropriate permissions classes for API views.
*   **Pagination:** Use standard DRF pagination classes (e.g., `PageNumberPagination`) and configure defaults in `settings.py`.
*   **Filtering:** Use `django-filter` for complex filtering capabilities.
*   **Authentication:** Ensure API endpoints are protected using appropriate authentication methods (e.g., SessionAuthentication, TokenAuthentication).

## Comprehensive API Implementation Guidelines

Based on our work with the IcePlant Management Portal, follow these detailed guidelines for backend-frontend API integration:

### Backend (Django) API Implementation

1. **File Organization:**
   * **Models:** Define data models in `<app_name>/models.py` with clear field definitions, defaults, and relationships
   * **Serializers:** Create serializers in `<app_name>/serializers.py` to transform model instances to JSON
   * **Views:** Implement ViewSets in `<app_name>/views.py` to handle CRUD operations and custom endpoints
   * **URLs:** Register URL routes in `<app_name>/api_urls.py` and include them in the main `urls.py`

2. **Model Design:**
   * Make fields nullable (`null=True, blank=True`) when appropriate to avoid migration issues
   * Add appropriate validators, defaults, and constraints
   * Use descriptive field names that match frontend usage
   * Define `__str__` methods for admin display

3. **ViewSet Implementation:**
   * Base CRUD operations:
     ```python
     class MaintenanceItemViewSet(viewsets.ModelViewSet):
         queryset = MaintenanceItem.objects.all()
         serializer_class = MaintenanceItemSerializer
     ```
   * Add filtering with query parameters in `get_queryset()`:
     ```python
     def get_queryset(self):
         queryset = MaintenanceItem.objects.all().order_by('-created_at')
         status = self.request.query_params.get('status', None)
         if status:
             queryset = queryset.filter(status=status)
         return queryset
     ```
   * Implement custom actions with `@action` decorator:
     ```python
     @action(detail=False, methods=['get'])
     def dashboard(self, request):
         # Dashboard aggregation logic
         return Response({"data": result})
     ```

4. **URL Registration:**
   * Register ViewSets with routers:
     ```python
     router = DefaultRouter()
     router.register(r'items', MaintenanceItemViewSet, basename='maintenanceitem')
     
     urlpatterns = [
         path('', include(router.urls)),
     ]
     ```
   * Add custom endpoints outside the router pattern:
     ```python
     urlpatterns = [
         path('', include(router.urls)),
         path('dashboard/', MaintenanceItemViewSet.as_view({'get': 'dashboard'})),
     ]
     ```

5. **Response Data Structure:**
   * Use consistent response structures
   * For collection endpoints, include count, pagination data, and results array
   * For dashboard endpoints, use clearly named sections:
     ```json
     {
       "upcomingMaintenance": [...],
       "recentMaintenance": [...],
       "stats": {
         "totalItems": 42,
         "itemsByStatus": [
           {"status": "operational", "count": 30}
         ]
       }
     }
     ```

### Frontend API Integration

1. **Service Layer:**
   * Define API endpoints in `services/endpoints.ts`:
     ```typescript
     export const endpoints = {
       maintenanceItems: '/api/maintenance/items/',
       maintenanceDashboard: '/api/maintenance/dashboard/'
     };
     ```
   * Use central API service (`services/api.ts`) for making HTTP requests:
     ```typescript
     const apiService = {
       async get(url: string, params?: any): Promise<any>,
       async post(url: string, data: any): Promise<any>,
       // other HTTP methods...
     };
     ```

2. **Data Fetching in Components:**
   * Use React hooks (useState, useEffect) for data fetching
   * Implement loading and error states:
     ```typescript
     const [data, setData] = useState<DataType | null>(null);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);
     
     useEffect(() => {
       const fetchData = async () => {
         try {
           setLoading(true);
           const response = await apiService.get(endpoints.maintenanceItems);
           setData(response);
         } catch (err) {
           console.error('Error fetching data:', err);
           setError('Failed to load data');
         } finally {
           setLoading(false);
         }
       };
       
       fetchData();
     }, [dependencies]);
     ```

3. **Data Transformation:**
   * When API responses don't match component needs, transform data in the component:
     ```typescript
     // Define expected interfaces
     interface ApiResponse {
       stats: {
         totalItems: number;
         itemsByStatus: Array<{ status: string; count: number }>;
       };
     }
     
     interface ComponentData {
       totalEquipment: number;
       equipmentByStatus: {
         operational: number;
         requires_maintenance: number;
       };
     }
     
     // Transform data
     const transformedData: ComponentData = {
       totalEquipment: apiData.stats.totalItems,
       equipmentByStatus: {
         operational: apiData.stats.itemsByStatus.find(
           item => item.status === 'operational'
         )?.count || 0,
         requires_maintenance: apiData.stats.itemsByStatus.find(
           item => item.status === 'requires_maintenance'
         )?.count || 0
       }
     };
     ```

4. **Error Handling:**
   * Always implement error handling in API calls
   * Use toast/snackbar notifications for user-friendly error messages
   * Add fallbacks for missing/null data (use default values or empty arrays)
   * Handle loading states with proper UI indicators

5. **Type Safety:**
   * Define TypeScript interfaces for all API request and response data
   * Keep interfaces in sync with backend serializer definitions
   * Explicitly type API responses to catch type mismatches

### API Testing and Debugging

1. **Backend Testing:**
   * Verify API responses with Django shell or Django REST framework browsable API
   * Test with curl commands or tools like Postman
   * Add unit tests for ViewSets and serializers

2. **Frontend Testing:**
   * Use browser devtools (MCP Browser Tools) to inspect network requests
   * Check request/response data in Network tab
   * Analyze console errors
   * Create test fixtures for common API responses

3. **Common Issues and Solutions:**
   * **404 Not Found:** Check URL paths, validate endpoint registration in `api_urls.py`
   * **TypeError: Cannot read property of undefined:** Add null checks, default values
   * **CORS errors:** Verify CORS settings in Django settings
   * **Authentication failures:** Check token validity, permissions, session expiration

### Integration Checklist

Before considering an API implementation complete, verify:

1. ✅ Models and migrations are properly created and applied
2. ✅ Serializers correctly represent model data
3. ✅ ViewSets implement required CRUD operations and custom endpoints
4. ✅ URLs are properly registered and accessible
5. ✅ Frontend interfaces match backend data structures
6. ✅ Components handle loading, error, and empty states
7. ✅ Data transformation logic is implemented where needed
8. ✅ Authentication and permissions are properly configured

## Frontend Structure Guidelines (React + TypeScript)

*   **Directory Structure:** Adhere strictly to the established `frontend/src` structure:
    *   `components/`: Reusable, generic UI components.
    *   `contexts/`: React Context API providers and consumers.
    *   `hooks/`: Custom reusable React hooks.
    *   `layouts/`: Page layout structures (e.g., `MainLayout`).
    *   `pages/`: Feature-specific or top-level page components (e.g., `ExpensesPage.tsx`, `MaintenancePage.tsx`). Components specific to a single page can reside in a sub-directory here.
    *   `services/`: Functions for interacting with the backend API. Use `endpoints.ts` to define API URLs.
    *   `theme/`: UI theme configuration (e.g., Material UI theme).
    *   `types/`: TypeScript type definitions, especially for API payloads and shared data structures.
    *   `utils/`: General utility functions.
*   **Component Naming:** Use PascalCase for component file names and named exports (e.g., `DataGridComponent.tsx`).
*   **Styling:** Utilize the established UI library (likely Material UI) and theme defined in `theme/`. Use `sx` prop or `styled` components for specific overrides.
*   **State Management:** Use React hooks (`useState`, `useReducer`) for local component state. Use Context API (`useContext`) for global or shared state.
*   **API Calls:** Centralize API call logic within the `services/` directory. Pages/components should import and use these service functions.
*   **Types:** Leverage TypeScript extensively. Define interfaces/types for props, state, and API data in `types/` or colocated if highly specific. 