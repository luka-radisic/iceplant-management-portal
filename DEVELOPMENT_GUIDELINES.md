# IcePlant Management Portal - Development Guidelines

This document outlines specific development patterns, best practices, and solutions identified while working on this project. Adhering to these guidelines helps maintain consistency and improves collaboration.

## Backend (Django)

### Updating Related Models on Save

*   **Pattern:** When saving or updating one model instance needs to trigger an update on a related model (e.g., completing a `MaintenanceRecord` should update the corresponding `MaintenanceItem`'s status and `last_maintenance_date`).
*   **Implementation:** Override the model's `save()` method. Inside the `save` method, perform the necessary checks (e.g., check if a specific field like `status` has changed to the trigger value like `'completed'`). If the condition is met, fetch the related object and update its fields accordingly before saving the related object.
*   **Example:** See the `save()` method override in `maintenance/models.py > MaintenanceRecord`.
*   **Alternative:** Django signals (like `post_save`) can also be used for more complex decoupling, but direct `save()` overrides are suitable for straightforward cases.

## API Design (DRF)

### Pagination Count Consistency

*   **Rule:** API endpoints that support filtering and pagination MUST return the correct `count` in the response body. This `count` should reflect the total number of items matching the *applied filters*, not the total number of items in the unfiltered dataset.
*   **Rationale:** Ensures accurate pagination controls on the frontend. If the count doesn't match the filtered results, the frontend pagination will display an incorrect number of pages.
*   **Example:** The `/api/sales/sales/` endpoint should return the count of sales matching the `buyer_name__icontains` filter, not the overall total sales count.

### Endpoint URL Verification

*   **Rule:** Always ensure the API endpoint URLs defined in the frontend (`frontend/src/services/endpoints.ts`) exactly match the URLs resolved by the Django backend routing (`urls.py` configurations, including DRF router conventions for actions like `/api/[app]/[model]/[action]/`).
*   **Rationale:** Mismatched URLs are a common source of API call failures (often 404 Not Found).
*   **Debugging:** Use browser network tools (MCP Network Logs) to check the exact URL being requested by the frontend and compare it against backend `urls.py` and viewset action definitions.

## Frontend (React/TypeScript)

### State Synchronization with API

*   **Rule:** Frontend state used in calculations related to API data (e.g., `pageSize` for pagination) must align with the actual behavior of the API. If the API returns 20 items per page, the frontend `pageSize` state used for calculating total pages should also be 20.
*   **Rule:** State derived directly from API responses (e.g., `totalItems` for pagination count) must be reliably updated whenever new data is fetched, especially after filtering.
*   **Example:** The `totalItems` state in `SalesPage.tsx` must be updated using `response.count` from the API *every time* `fetchSales` runs, ensuring the pagination reflects the currently displayed dataset (filtered or unfiltered).

### Accessibility: Modal Focus Management

*   **Problem:** Using `aria-hidden="true"` on a container (like a closing MUI `Dialog`) while an element inside it still has focus causes accessibility issues.
*   **Solution (MUI Dialog):** Use the `TransitionProps={{ onExited: ... }}` prop on the `Dialog` component. Place logic that cleans up the dialog's internal state (e.g., resetting form data, clearing fetched records) inside the `onExited` callback. This ensures cleanup happens *after* the dialog has fully transitioned out and focus has likely returned to the main document, preventing the focus conflict.
*   **Example:** See the `Dialog` implementation in `frontend/src/components/maintenance/EquipmentList.tsx`.

## General Debugging

*   **Practice:** When troubleshooting issues, always check logs from both the frontend (Browser Console / MCP Tools) and the backend (Django development server terminal output).
*   **Rationale:** Errors can originate in either layer, or issues might only become clear when comparing the request/response flow across both. 