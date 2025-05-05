# Group Module Permissions Management Fix

## Issue Description

Users were unable to save module permissions when creating or editing groups through the Group Management UI. While the UI displays which modules a group can access, changes to these permissions were not being saved or persisted anywhere.

## Root Cause

1. **Missing Backend Endpoint**: There was no API endpoint to update the module permissions for a group.
2. **Incomplete Frontend Implementation**: The frontend code was not sending module permission changes to the backend.

## Implementation Details

### Backend Changes

1. **Added New API Endpoint**
   - Created a new endpoint at `/api/users/update-group-modules/` to handle updating module permissions for groups
   - The endpoint accepts a POST request with the following structure:
   ```json
   {
     "group_name": "Test Group",
     "modules": {
       "maintenance": true,
       "inventory": false,
       "sales": true,
       ...
     }
   }
   ```
   - The endpoint updates the `MODULE_GROUP_MAPPING` dictionary in the `HasModulePermission` class
   - Only users in the "Admins" group or superusers have permission to call this endpoint

2. **URL Configuration**
   - Added the new endpoint to the `users/urls.py` file
   - Route: `path('update-group-modules/', update_group_module_permissions, name='update-group-modules')`

### Frontend Changes

1. **API Client Integration**
   - Added the new endpoint URL to `endpoints.ts`: `updateGroupModules: '/api/users/update-group-modules/'`

2. **Group Management UI Updates**
   - Updated the `handleSaveGroup` function to also send module permission changes
   - Modified the group creation and editing flow to include the selected module permissions
   - Removed the warning message that previously indicated module permissions couldn't be changed

3. **Module Permission Display**
   - The UI already correctly displayed which modules a group has access to
   - The checkboxes were already functional but previously had no effect on saving

## How It Works Now

1. When creating a new group:
   - Users specify the group name and select which modules the group should have access to
   - Both the group name and module permissions are saved

2. When editing an existing group:
   - The UI loads the current module permissions for that group
   - Users can modify which modules the group has access to
   - Changes to module permissions are saved along with any name changes

3. Module permissions are enforced by the backend through the `HasModulePermission` class

## Limitations

- Module permission changes are only stored in memory and will be lost if the server restarts
- For a production environment, these changes should be persisted to a database or configuration file
- Consider implementing a more permanent storage solution in the future

## Testing

The changes have been tested with various scenarios:
- Creating a new group with specific module permissions
- Editing an existing group's module permissions
- Verifying that users in groups can only access the modules they have permission for
