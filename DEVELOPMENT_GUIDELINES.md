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

### Frontend UI Consistency Guidelines

To ensure a cohesive, modern, and professional UI across all pages, follow these guidelines:

**1. Global Theme Consistency**
- Use the shared theme (`theme.ts`) with `ThemeProvider`.
- Use theme palette colors (`primary`, `secondary`, `success`, `warning`, `error`) for buttons, chips, icons, highlights.
- Use theme typography variants (`h4`, `h5`, `subtitle1`, `body1`, etc.) for all text.

**2. Layout and Containers**
- Use `Box` and `Grid` for responsive layouts with consistent spacing (`p`, `m`, `mb`, `mt`).
- Wrap filters, search bars, and action buttons inside `Paper` with padding (`p: 2`) and margin (`mb: 3`).
- Use `Paper` or `Card` with `elevation={2}` or `3` for content sections.

**3. Tables**
- Wrap tables in `TableContainer` inside `Paper` with `elevation={4}`, `borderRadius: 2`, `boxShadow: 3`.
- Style table headers with `sx={{ bgcolor: 'grey.300' }}` and bold font.
- Use `size="small"` for compactness.

**4. Typography**
- Use `Typography` components for all text.
- Headings: `variant="h4"` or `h5` with `fontWeight="bold"`.
- Section titles: `variant="h6"` with `fontWeight="medium"`.
- Body text: `variant="body1"` or `body2`.

**5. Buttons and Actions**
- Use consistent `Button` variants (`contained`, `outlined`, `text`).
- Use theme colors (`color="primary"`, `"secondary"`, `"error"`, `"success"`).
- Add icons to buttons where appropriate.
- Group action buttons with consistent spacing.

**6. Chips and Status Indicators**
- Use `Chip` components with theme colors:
  - `color="success"` for active/complete.
  - `color="error"` for errors/no show.
  - `color="warning"` for warnings.
  - `color="info"` for informational states.
- Use outlined or filled variants consistently.

**7. Cards and Charts**
- Use `Card` or `Paper` with padding and elevation for charts and summaries.
- Add hover effects (`transform: translateY(-5px)`, `boxShadow`) for interactivity.
- Use consistent margins and heights.

**8. Dialogs and Modals**
- Use `Dialog` with `maxWidth` and `fullWidth`.
- Add padding inside `DialogContent`.
- Use `Typography` for titles and content.
- Style action buttons consistently.

**9. Filters and Search**
- Group filters inside `Paper` with padding and margin.
- Use `TextField` with `size="small"` and `fullWidth`.
- Use `DatePicker` with consistent formatting.
- Add icons inside inputs using `InputAdornment`.

**10. Spacing and Alignment**
- Maintain consistent spacing (`p`, `m`, `mb`, `mt`).
- Align headers and actions with `Box display="flex" justifyContent="space-between" alignItems="center"`.

**11. Remove Inline Styles**
- Minimize custom inline styles.
- Use the theme and `sx` props referencing theme variables.

### Accessibility: Modal Focus Management

*   **Problem:** Using `aria-hidden="true"` on a container (like a closing MUI `Dialog`) while an element inside it still has focus causes accessibility issues.
*   **Solution (MUI Dialog):** Use the `TransitionProps={{ onExited: ... }}` prop on the `Dialog` component. Place logic that cleans up the dialog's internal state (e.g., resetting form data, clearing fetched records) inside the `onExited` callback. This ensures cleanup happens *after* the dialog has fully transitioned out and focus has likely returned to the main document, preventing the focus conflict.
*   **Example:** See the `Dialog` implementation in `frontend/src/components/maintenance/EquipmentList.tsx`.

## General Debugging

*   **Practice:** When troubleshooting issues, always check logs from both the frontend (Browser Console / MCP Tools) and the backend (Django development server terminal output).
*   **Rationale:** Errors can originate in either layer, or issues might only become clear when comparing the request/response flow across both. 