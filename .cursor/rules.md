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