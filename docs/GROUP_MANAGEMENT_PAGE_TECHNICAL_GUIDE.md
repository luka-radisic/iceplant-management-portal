# Group Management Page Technical Guide

## Overview

This document provides a technical overview of the Group Management page implementation in the IcePlant Management Portal. It covers the architecture, components, API endpoints, and key functions involved in the group management and module permission system.

## Architecture

The Group Management implementation follows a client-server architecture:

1. **Frontend**: React/TypeScript components in the `frontend/src/pages/admin` directory
2. **Backend**: Django REST Framework API endpoints in the `users/api_views_groups.py` file
3. **Persistence**: Module permissions are stored in memory and persisted to a JSON file

## Frontend Implementation

### Key Components

#### GroupManagementPage Component

**Location**: `frontend/src/pages/admin/GroupManagementPage.tsx`

This is the main component that renders the Group Management UI and handles all interactions.

**State Management**:
- `groups`: Array of all user groups
- `moduleMapping`: Dictionary mapping modules to groups that can access them
- `availableModules`: Array of modules with their permission status
- `selectedGroup`: Currently selected group for editing
- `dialogMode`: 'create' or 'edit' mode for the dialog

**Key Functions**:

1. `fetchGroups()`: Loads all groups from the API
2. `fetchModuleMapping()`: Loads the module-group mapping from the API
3. `openCreateDialog()`: Opens the dialog in creation mode
4. `openEditDialog(group)`: Opens the dialog in edit mode for a specific group
5. `handleSaveGroup()`: Saves group changes and updates module permissions
6. `handleDeleteGroup(group)`: Deletes a group
7. `handleModuleToggle(moduleKey)`: Toggles access to a specific module
8. `hasModuleAccess(groupName, moduleKey)`: Checks if a group has access to a module

### API Integration

The component uses the following API endpoints:

1. `GET /api/users/groups/`: Fetches all groups
2. `POST /api/users/groups/`: Creates a new group
3. `PUT /api/users/groups/:id/`: Updates an existing group
4. `DELETE /api/users/groups/:id/`: Deletes a group
5. `GET /api/users/module-permissions/`: Gets the module-group mapping
6. `POST /api/users/update-group-modules/`: Updates module permissions for a group

## Backend Implementation

### Models

The implementation uses Django's built-in `Group` model from `django.contrib.auth.models`.

### API Views

#### GroupViewSet

**Location**: `users/api_views_groups.py`

Handles CRUD operations for groups.

**Key Methods**:
- `create(request)`: Creates a new group
- `perform_destroy(instance)`: Deletes a group and removes it from module permissions

#### Module Permission API Endpoints

1. `module_group_mapping(request)`: Returns the current module-group mapping
2. `update_group_module_permissions(request)`: Updates module permissions for a group

### Permission Classes

#### HasModulePermission

**Location**: `iceplant_core/group_permissions.py`

Checks if a user has permission to access a specific module.

**Key Attributes**:
- `MODULE_GROUP_MAPPING`: Dictionary mapping modules to groups that can access them

## Module Permission System

### Storage Format

Module permissions are stored in the `MODULE_GROUP_MAPPING` dictionary:

```python
MODULE_GROUP_MAPPING = {
    'attendance': ['HR', 'Managers', 'Admins'],
    'sales': ['Sales', 'Accounting', 'Managers', 'Admins'],
    'inventory': ['Inventory', 'Operations', 'Managers', 'Admins'],
    'expenses': ['Accounting', 'Finance', 'Managers', 'Admins'],
    'maintenance': ['Maintenance', 'Operations', 'Managers', 'Admins'],
    'buyers': ['Sales', 'Accounting', 'Managers', 'Admins'],
}
```

### Persistence

Module permissions are persisted to disk using the `save_module_permissions()` function in `module_permissions_utils.py`. The permissions are saved to a JSON file and loaded on server startup.

### Permission Checking

When a user tries to access a module, the `has_permission()` method of the `HasModulePermission` class is called. It checks:

1. If the user is a superuser (always granted access)
2. If the user is authenticated
3. If the user is in any group that has access to the requested module

## Implementation Details

### Group Creation Flow

1. User enters group name and selects module permissions
2. `handleSaveGroup()` creates the group via API
3. Group creation response includes the new group ID
4. Module permissions are then updated via a separate API call

### Group Editing Flow

1. `openEditDialog()` loads current group data and module permissions
2. User makes changes to group name and/or module permissions
3. `handleSaveGroup()` updates the group name
4. Module permissions are updated via a separate API call

### Group Deletion Flow

1. User clicks delete button and confirms
2. `handleDeleteGroup()` sends DELETE request to API
3. Backend's `perform_destroy()` method removes group from all module permissions
4. UI refreshes to show updated group list

### Module Permission Update Flow

1. User toggles module access checkboxes
2. `handleModuleToggle()` updates local state
3. On save, `handleSaveGroup()` collects all module settings
4. Settings are sent to the `update-group-modules` endpoint
5. Backend updates the `MODULE_GROUP_MAPPING` dictionary
6. Changes are persisted to disk via `save_module_permissions()`

## Error Handling

The implementation includes error handling for:
- Failed API requests
- Invalid group names
- Permission denied errors
- Module not found errors

## Performance Considerations

- Module permissions are loaded once on page load
- Group list is refreshed after each operation
- Operations are performed sequentially to avoid race conditions

## Security Considerations

- All API endpoints require authentication
- Group management endpoints require admin privileges
- Module permission endpoints require admin privileges

## Common Issues and Solutions

### Issue: Module permissions not updating in UI

**Solution**: Refresh module mapping after updating permissions with `fetchModuleMapping()`.

### Issue: Module permissions not persisting across server restarts

**Solution**: Ensure the `save_module_permissions()` function is called after updating permissions.

### Issue: Group appears in UI but not in module permissions

**Solution**: Clean up module permissions with the `cleanup_module_permissions` command.

## Code Snippets

### Updating Module Permissions

```typescript
// Frontend
const handleSaveGroup = async () => {
  // Create/update the group first
  // ...
  
  // Then update module permissions
  try {
    const modulePermissions = {};
    availableModules.forEach(module => {
      modulePermissions[module.key] = module.allowed;
    });
    
    await apiClient.post(endpoints.updateGroupModules, {
      group_name: groupName,
      modules: modulePermissions
    });
    
    // Refresh module mapping
    await fetchModuleMapping();
    
    enqueueSnackbar('Module permissions updated successfully', { variant: 'success' });
  } catch (err) {
    console.error('Error updating module permissions:', err);
    enqueueSnackbar('Group created but module permissions could not be updated', { variant: 'warning' });
  }
};
```

```python
# Backend
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_group_module_permissions(request):
    group_name = request.data.get('group_name')
    modules = request.data.get('modules', {})
    
    # Update module permissions
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    for module, has_access in modules.items():
        if module not in module_mapping:
            continue
            
        if has_access:
            # Add group to module permissions if not already there
            if group_name not in module_mapping[module]:
                module_mapping[module].append(group_name)
        else:
            # Remove group from module permissions if it's there
            if group_name in module_mapping[module]:
                module_mapping[module].remove(group_name)
    
    # Persist changes to disk
    save_module_permissions()
    
    return Response({
        "message": f"Module permissions updated for group '{group_name}'",
        "updated_mapping": module_mapping
    })
```

## Future Development Recommendations

1. **Database Integration**
   - Move module permissions to the database
   - Implement migrations and models for permissions

2. **UI Improvements**
   - Add drag-and-drop interface for module assignment
   - Implement batch operations for permissions

3. **Performance Optimizations**
   - Implement caching for module permissions
   - Add pagination for large group lists

4. **Role-Based Access Control**
   - Extend the system to support more fine-grained permissions
   - Implement role inheritance for more complex permission structures
