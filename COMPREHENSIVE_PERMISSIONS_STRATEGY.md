# Comprehensive Permission Strategy for IcePlant Management Portal

**Version:** 1.0
**Date:** May 8, 2025
**Author:** GitHub Copilot

## 1. Overview

This document outlines the comprehensive permission strategy for the IcePlant Management Portal. It details a dual-layer system designed to provide both broad module-level access control and fine-grained control over specific actions and data operations within the application.

The primary goals of this strategy are:
*   **Precision:** Ensure users can only access features and perform actions appropriate to their roles.
*   **Clarity:** Provide a clear model for how permissions are defined, assigned, and checked.
*   **Maintainability:** Offer a manageable approach for administrators.
*   **Scalability:** Allow for future expansion of modules, roles, and permissions.

### 1.1. The Dual Permission System

The strategy employs two interconnected permission systems:

1.  **Custom Module Permissions (`MODULE_GROUP_MAPPING` - JSON-based):**
    *   **Purpose:** Controls high-level access to broad application "modules" (e.g., Attendance, Inventory, Sales). Primarily dictates UI visibility (which menu items or sections a user sees) and access to high-level API endpoints gating entire modules.
    *   **Mechanism:** Managed via a JSON file (`module_permissions.json`) and the `/api/users/update-group-modules/` API endpoint. Enforced in the backend by the `@has_module_permission` decorator.

2.  **Django Granular Permissions (Django `auth` framework):**
    *   **Purpose:** Controls specific actions on data models (e.g., Can add attendance record, Can change inventory item, Can approve expense report). Provides fine-grained control over what a user can *do* within a module they have access to.
    *   **Mechanism:** Utilizes Django's built-in `django.contrib.auth.models.Permission` and `Group` models. Permissions are typically named `app_label.action_modelname` (e.g., `attendance.add_attendancerecord`). Enforced via Django Rest Framework's permission classes (like `DjangoModelPermissions`), `user.has_perm()` checks, or `@permission_required` decorators.

**How They Work Together:**
A user first needs module access (via the JSON system) to see a section of the application. Then, within that section, their ability to perform specific actions (e.g., click an "Edit" button, submit a form for adding data) is determined by their assigned Django granular permissions.

## 2. Core Concepts

### 2.1. Application Modules
The application is divided into the following high-level modules. This list may evolve.
*   `attendance`
*   `sales`
*   `inventory`
*   `expenses`
*   `maintenance`
*   `buyers`
*   `users_management` (Covers user and group admin within the app, distinct from Django admin)
*   `company_config` (General company settings)

### 2.2. Standard User Roles/Groups
The following standard groups are proposed. These can be created and managed via the Django Admin interface. Additional custom groups can be created as needed.

*   **`Admins`**: Super-administrators of the application. Typically have all module access and all granular permissions.
*   **`Office Head`**: General management role, may require broad read-only access to many modules and specific operational permissions.
*   **`HR Head`**: Manages all HR functions.
*   **`HR Staff`**: Performs routine HR tasks, data entry.
*   **`HR Payroll`**: Specialized HR role focusing on payroll-related aspects of attendance and expenses.
*   **`Inventory Manager`**: Full control over the inventory module.
*   **`Sales Team`**: Manages sales processes.
*   **`Maintenance Crew`**: Manages maintenance records and items.
*   **`General User`**: Basic access, if applicable (e.g., view own profile).

### 2.3. Django Permissions
Django automatically creates `add`, `change`, `delete`, and `view` permissions for each model defined in your applications.
*   Example: For an `AttendanceRecord` model in the `attendance` app, Django creates:
    *   `attendance.add_attendancerecord`
    *   `attendance.change_attendancerecord`
    *   `attendance.delete_attendancerecord`
    *   `attendance.view_attendancerecord`

### 2.4. Custom Django Permissions
For actions not covered by standard CRUD operations (e.g., "approve attendance," "reject expense report"), custom permissions can be defined in the model's `Meta` class:
```python
# example in models.py
class AttendanceRecord(models.Model):
    # ... fields ...
    class Meta:
        permissions = [
            ("approve_attendancerecord", "Can approve attendance record"),
            ("reject_attendancerecord", "Can reject attendance record"),
        ]
```
These will then be available as `attendance.approve_attendancerecord` in the Django admin.

## 3. Permission Definitions Matrix

This matrix outlines the recommended permissions for standard roles.
*   **Module Access (JSON):** "Yes" means the group should be added to this module in the `module_permissions.json` file, making the UI section visible.
*   **Granular Django Permissions:** Lists key Django permissions. `view_*`, `add_*`, `change_*`, `delete_*` refer to the relevant models within that module.

| Module         | Role/Group        | Module Access (JSON) | Key Granular Django Permissions (Examples)                                                                                                | Example Functions Enabled                                                                                                |
|----------------|-------------------|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| **Attendance** | `HR Head`         | Yes                  | `attendance.view_attendancerecord`, `add_attendancerecord`, `change_attendancerecord`, `delete_attendancerecord`, `approve_attendancerecord`, `reject_attendancerecord`, `view_employeeprofile` (all actions) | Full control over attendance, approvals, employee profiles. View/Edit HR Notes.                                          |
|                | `HR Staff`        | Yes                  | `attendance.view_attendancerecord`, `add_attendancerecord`, `change_attendancerecord`, `view_employeeprofile`, `add_employeeprofile`, `change_employeeprofile` | Manage attendance data, manage employee profiles. May view HR Notes if explicitly granted.                               |
|                | `HR Payroll`      | Yes                  | `attendance.view_attendancerecord` (filtered to relevant employees if possible), `view_employeeprofile` (limited fields)                  | View attendance for payroll processing. May add/view HR Notes if explicitly granted.                                     |
| **Inventory**  | `Inventory Manager` | Yes                  | `inventory.view_inventoryitem` (all actions), `view_inventoryadjustment` (all actions)                                                  | Full control over inventory items and adjustments.                                                                       |
|                | `Office Head`     | Yes                  | `inventory.view_inventoryitem`, `inventory.view_inventoryadjustment`                                                                    | View inventory status and adjustments. No edit/change capabilities.                                                      |
|                | `Sales Team`      | Yes (Potentially)    | `inventory.view_inventoryitem` (potentially limited view, e.g., stock levels)                                                           | View stock levels for sales purposes.                                                                                    |
| **Sales**      | `Sales Team`      | Yes                  | `sales.view_sale` (all actions), `buyers.view_buyer` (all actions)                                                                      | Full control over sales records and buyer information.                                                                   |
|                | `Office Head`     | Yes                  | `sales.view_sale`, `buyers.view_buyer`                                                                                                  | View sales performance and buyer data.                                                                                   |
| **Expenses**   | `HR Head`         | Yes                  | `expenses.view_expense` (all actions, esp. for employees), `approve_expense` (custom perm)                                              | Manage and approve/reject employee expenses.                                                                             |
|                | `HR Payroll`      | Yes                  | `expenses.view_expense` (for payroll processing)                                                                                        | View expenses for payroll.                                                                                               |
|                | `General User`    | Yes (Limited)        | `expenses.add_expense` (own), `expenses.view_expense` (own), `expenses.change_expense` (own)                                            | Submit and manage own expenses.                                                                                          |
| **Users Mgt.** | `Admins`          | Yes                  | `auth.view_user`, `add_user`, `change_user`, `delete_user`, `view_group`, `add_group`, `change_group`, `delete_group` (via Django Admin) | Full control over users and groups.                                                                                      |
|                | `HR Head`         | Yes (Limited)        | `auth.view_user` (non-sensitive fields), `change_user` (specific HR-related fields), `auth.view_group` (assign users to non-admin groups) | Manage user profiles (HR aspects), assign users to operational groups.                                                   |

*(This matrix is illustrative and should be expanded and refined based on all specific models and desired actions within each module.)*

## 4. Implementation Details

### 4.1. Backend

*   **Custom Module Permissions (`MODULE_GROUP_MAPPING`):**
    *   **Storage:** `iceplant_portal/iceplant_core/module_permissions.json` (and potentially other paths as defined in `STANDARD_PERMISSION_PATHS` in `module_permissions_utils.py`).
    *   **Management API:** `POST /api/users/update-group-modules/` (View: `users.api_views_groups.update_group_module_permissions`). This API updates the JSON file.
    *   **Loading:** Loaded into memory at application start by `iceplant_core.group_permissions.load_module_permissions`.
    *   **Enforcement:** `@has_module_permission('module_name')` decorator (defined in `iceplant_core.permissions.py`). This checks the in-memory `MODULE_GROUP_MAPPING`.

*   **Django Granular Permissions:**
    *   **Definition:**
        *   Auto-generated by Django for models.
        *   Custom permissions in model `Meta` classes (e.g., `class Meta: permissions = [("custom_action", "Can custom_action")]`).
    *   **Assignment to Groups:**
        *   **Primary Method:** Manually via the Django Admin interface (`/admin/auth/group/`). This provides the most explicit control.
        *   **(Future Enhancement):** Consider programmatically assigning a *default set* of granular permissions when a group is given module access via the `update-group-module-permissions` API if consistent defaults can be defined. This would involve modifying `set_modules_for_group` in `module_permissions_utils.py` to also interact with `group.permissions.add(permission_object)`.
    *   **Enforcement in API Views:**
        *   **DRF ModelViewSets:** Use `permission_classes = [IsAuthenticated, DjangoModelPermissions]` (or `DjangoModelPermissionsOrAnonReadOnly`). This automatically checks for `app.view_model`, `app.add_model`, etc., based on the request method.
        *   **DRF APIView/function-based views:**
            *   `if request.user.has_perm('app_label.codename'): ...`
            *   `@permission_required('app_label.codename', raise_exception=True)` decorator.
        *   **Object-Level Permissions:** For checking permissions on specific object instances (e.g., user can only edit *their own* expense report), use DRF's `DjangoObjectPermissions` or custom permission classes.

*   **Key Files:**
    *   `iceplant_portal/users/api_views_groups.py`: Contains `update_group_module_permissions` API and `GroupViewSet`.
    *   `iceplant_portal/iceplant_core/permissions.py`: Contains `@has_module_permission`.
    *   `iceplant_portal/iceplant_core/group_permissions.py`: Loads `MODULE_GROUP_MAPPING`.
    *   `iceplant_portal/iceplant_core/module_permissions_utils.py`: Saves/manages the JSON file.
    *   Individual app `views.py` files: For enforcement of granular permissions.
    *   Individual app `models.py` files: For defining custom granular permissions.

### 4.2. Frontend (React)

*   **Determining Module Visibility:**
    *   On login, or via a dedicated endpoint (e.g., `/api/users/me/module-access/`), fetch the list of modules the current user's groups have access to based on the `MODULE_GROUP_MAPPING`.
    *   Use this list to conditionally render menu items, navigation links, and entire sections/pages.

*   **Determining Granular Action Enablement:**
    *   **Option 1 (Permissions List):** The API endpoint that provides user information (e.g., `/api/users/me/`) should be enhanced to include a list of all granular Django permission codenames assigned to the user (e.g., `["attendance.add_attendancerecord", "inventory.view_inventoryitem"]`).
    *   **Option 2 (Specific Checks - Less Ideal):** Frontend makes assumptions or has hardcoded roles, which is less flexible.
    *   **Implementation:** Frontend components (e.g., buttons for "Add", "Edit", "Delete", "Approve") should be conditionally rendered or enabled/disabled based on whether the user possesses the required granular permission codename from the list obtained in Option 1.
    *   Example: `canShowApproveButton = userPermissions.includes('attendance.approve_attendancerecord')`.

## 5. Managing Permissions: Administrator's Guide

1.  **Define User Roles (Groups):**
    *   Navigate to Django Admin: `/admin/auth/group/`.
    *   Click "Add group".
    *   Enter the group name (e.g., `HR Head`, `Inventory Manager`). Save.

2.  **Assign Granular Django Permissions to Groups:**
    *   In the Django Admin, go to the newly created/existing group.
    *   In the "Permissions" section, select the required granular permissions from the "Available permissions" list and move them to the "Chosen permissions" box.
    *   Example: For `HR Head`, select all permissions related to `attendance`, `employeeprofile`, relevant `expense` permissions, etc.
    *   Save the group.

3.  **Grant Module Access (UI Visibility):**
    *   This is managed via the `MODULE_GROUP_MAPPING` JSON file.
    *   **Method A (API - Recommended for automation/integration):**
        *   Use a tool (like Postman, curl, or a custom admin interface if built) to send a POST request to `/api/users/update-group-modules/`.
        *   Payload example:
            ```json
            {
                "group_name": "HR Head",
                "modules": {
                    "attendance": true,
                    "expenses": true
                }
            }
            ```
        *   This will add "HR Head" to the "attendance" and "expenses" lists in `module_permissions.json`.
    *   **Method B (Manual JSON Edit - Use with caution, requires server restart):**
        *   Directly edit `iceplant_portal/iceplant_core/module_permissions.json`.
        *   Ensure the server is restarted for changes to take effect if `group_permissions.py` only loads on startup. (The current API approach updates the in-memory version and saves, so a restart isn't needed for API changes).

4.  **Assign Users to Groups:**
    *   In Django Admin: `/admin/auth/user/`.
    *   Select a user.
    *   In the "Groups" section, move the desired groups from "Available groups" to "Chosen groups".
    *   Save the user.

**Important Relationship:** A user will only see a module in the UI if their group is granted access via the JSON system (Step 3). Once they see the module, their ability to perform actions within it depends on the granular Django permissions assigned to their group (Step 2). Both steps are necessary for full functionality.

## 6. Troubleshooting Common Permission Issues

*   **Symptom: User cannot see a module/menu item.**
    *   **Check 1:** Is the user assigned to the correct group(s) in Django Admin?
    *   **Check 2:** Does that group have `true` for the relevant module in the `MODULE_GROUP_MAPPING` (verify via `/api/users/module-permissions/` GET endpoint or by inspecting the JSON file)?
    *   **Check 3 (Frontend):** Is the frontend logic correctly fetching and interpreting these module access rights?

*   **Symptom: User can see a module, but an action button (e.g., "Edit", "Approve") is disabled, or an action results in a "Permission Denied" API error.**
    *   **Check 1:** Is the user assigned to the correct group(s)?
    *   **Check 2 (Django Admin):** Does the user's group have the specific granular Django permission required for that action (e.g., `attendance.change_attendancerecord`, `expenses.approve_expense`) in the "Chosen permissions" list for that group?
    *   **Check 3 (Backend):** Is the API view correctly checking for this granular permission (e.g., using `DjangoModelPermissions`, `user.has_perm()`)?
    *   **Check 4 (Frontend):** If a button is disabled, is the frontend correctly fetching and checking the user's granular permissions list?

*   **Symptom: Changes to `module_permissions.json` (manual edit) don't reflect immediately.**
    *   **Cause:** The application loads the JSON into memory on startup. Manual edits require a server restart or using the `/api/users/update-group-modules/` endpoint which updates both disk and memory.

## 7. Future Enhancements (Considerations)

*   **Admin UI for Module Access:** Create a section in the application's admin interface (not Django Admin) for managing which groups have access to which modules (i.e., a UI for the `/api/users/update-group-modules/` endpoint).
*   **Default Permission Sets:** When a group is granted module access via the API, programmatically assign a predefined *default set* of essential granular Django permissions for that module. This can simplify setup but requires careful definition of these default sets.
*   **Role-Based Permission Inheritance (Advanced):** For very complex scenarios, explore options for permission inheritance between groups or roles.
*   **Audit Log for Permission Changes:** Implement logging for when group permissions (both module and granular) are modified.

This strategy provides a robust foundation. It will require careful setup of groups and their associated permissions, but will result in a much more secure and correctly functioning application.

## 8. Vision for an Integrated Access Permission Management Page (Frontend)

This section outlines the vision for a comprehensive "Access Permission" management page within the frontend of the IcePlant Management Portal. This page would serve as a centralized hub for administrators to manage users, groups, module access, and granular Django permissions, reducing reliance on the Django Admin interface for day-to-day access control tasks.

### 8.1. Core Functionalities

The integrated page should provide the following functionalities:

1.  **User Management:**
    *   **List Users:** Display a paginated, searchable, and sortable list of all users.
    *   **Create User:** A form to add new users, including username, password (with confirmation), email, first name, last name, and active status.
    *   **Edit User:** Modify existing user details.
    *   **Assign User to Groups:** A multi-select interface to assign/unassign a user to one or more groups.
    *   **(Optional) Impersonate User:** For superusers, a feature to temporarily log in as another user for troubleshooting (requires specific backend support).

2.  **Group Management:**
    *   **List Groups:** Display a list of all groups.
    *   **Create Group:** Form to define a new group name and an optional description.
    *   **Edit Group:** Modify group name and description.
    *   **Delete Group:** Remove a group (with warnings if users or critical permissions are assigned).
    *   **View Users in Group:** Easily see a list of users assigned to a specific group.

3.  **Module Access Assignment (for Groups):**
    *   **Interface:** A clear matrix or checklist (e.g., groups as rows, modules as columns) to grant or revoke access to high-level application modules for each group.
    *   **Backend Interaction:** This UI would interact with an enhanced version of the `/api/users/update-group-modules/` endpoint or a new dedicated API.
    *   **Module Display:** The list of modules should be dynamically fetched from the backend to reflect all available modules for which access can be managed.

4.  **Granular Django Permission Assignment (for Groups):**
    *   **Interface:** For a selected group, display all available Django permissions, categorized by application/model (similar to the Django Admin interface).
    *   **Permission Display:** Permissions should be shown with their human-readable names (e.g., "attendance | attendance record | Can add attendance record").
    *   **Assignment:** Allow administrators to select/deselect individual or multiple permissions for the group.
    *   **Backend API Requirements:** This is the most significant new development. It would require:
        *   An API endpoint to list all available Django permissions (app_label, codename, name).
        *   An API endpoint to get the current granular permissions for a specific group.
        *   An API endpoint to update (add/remove) granular permissions for a specific group.

5.  **Module Definitions (Considerations for "Module Creation")**
    *   **Current State:** High-level modules (used in the JSON-based system) are typically defined by the backend application structure (e.g., Django apps, specific decorators, or a central list like `MODULE_DEFINITIONS`).
    *   **Managing Existing Modules:** The "Module Access Assignment" UI (point 3) would manage permissions for these *existing, backend-defined* modules.
    *   **Dynamic Module Creation via UI:** Allowing administrators to define *entirely new* modules (e.g., create a "Logistics" module from scratch through the UI, which then becomes available for permission assignment and requires new backend code/views) is a very complex architectural feature. It implies dynamic code generation or a highly abstract plugin system, which is likely beyond the scope of typical application permission management UIs.
    *   **Recommendation:** Focus on managing access to *pre-defined* modules. If new modules are needed, they would be added as part of a new development/release cycle by developers, and then they would automatically appear in the "Module Access Assignment" UI.

### 8.2. User Experience (UX) Considerations

*   **Intuitive Navigation:** Clear separation between user, group, and permission management sections.
*   **Search and Filtering:** Essential for managing large lists of users, groups, or permissions.
*   **Bulk Actions:** Where appropriate (e.g., assign multiple users to a group, assign multiple permissions to a group).
*   **Feedback and Confirmation:** Clear messages for successful actions or errors.
*   **Role-Based Access to this Page:** Access to this "Access Permission" page itself should be restricted, typically to `Admins` or a dedicated `Security Administrator` group.

### 8.3. Backend API Enhancements Required

To support this frontend vision, several new or enhanced backend API endpoints would be necessary beyond the existing ones:

*   **Users:** Full CRUD for users (if not already fully covered by `UserManagementViewSet`).
*   **Groups:** Full CRUD for groups (extending `GroupViewSet` if needed).
*   **Granular Permissions:**
    *   `GET /api/permissions/all/`: List all available Django permissions (codename, name, app_label).
    *   `GET /api/groups/{group_id}/granular-permissions/`: List granular Django permissions currently assigned to a group.
    *   `POST /api/groups/{group_id}/granular-permissions/`: Update (set/replace) the list of granular permissions for a group.
    *   Alternatively, `PUT /api/groups/{group_id}/assign-permission/` and `PUT /api/groups/{group_id}/revoke-permission/` for individual permission changes.
*   **Module List:**
    *   `GET /api/modules/definitions/`: An endpoint to list all defined modules for which module-level access can be set (to populate the UI in 8.1.3).

Implementing this comprehensive "Access Permission" page would be a significant step towards a highly manageable and secure application. It bridges the gap between the high-level module access and the fine-grained Django permissions, providing administrators with unified control.
