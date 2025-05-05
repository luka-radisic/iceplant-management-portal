# Group Management Module Issues and Fixes

## Overview

This document summarizes the issues identified and fixes implemented for the Group Management module in the IcePlant Management Portal. The fixes address problems with module permissions not being properly saved and persisted when using the Group Management UI.

## Issues Identified

1. **Module Permission Persistence**
   - Module permissions were not persisting across server restarts
   - When updating module permissions via the frontend, changes would not be saved
   - Deleting and recreating a group with the same name would incorrectly retain old permissions

2. **Group Management API**
   - The backend API was missing an endpoint to update module permissions for a group
   - The frontend UI allowed toggling module permissions, but did not send these changes to the backend
   - There was no cleanup mechanism to remove deleted groups from module permissions

3. **Module Permission Management UI**
   - The UI displayed current module permissions correctly but changes weren't being saved
   - No visual feedback was provided to confirm module permission changes
   - Misleading warning messages suggested module permissions couldn't be changed

## Root Causes

1. **Missing Backend Support**
   - No API endpoint existed for updating which modules a group has permission to access
   - Changes were only stored in memory, not persisted to disk or database
   - No cleanup process was removing stale group references from module permissions

2. **Frontend Implementation**
   - The UI was correctly displaying module permissions but not sending updates
   - `handleSaveGroup` function only sent group name changes, not module permission changes
   - No error handling or feedback for failed permission updates

## Implemented Solutions

### Backend Changes

1. **Added Module Permission Update API**
   - Created a new API endpoint: `/api/users/update-group-modules/`
   - The endpoint accepts a POST request with group name and module access settings
   - Implemented proper authorization checks requiring admin privileges

2. **Module Permission Persistence**
   - Implemented saving module permissions to a JSON file on disk
   - Added code to load permissions from disk on server startup
   - Ensured permissions persist across server restarts

3. **Group Deletion Cleanup**
   - Enhanced the `perform_destroy` method in `GroupViewSet` to remove deleted groups from all module permissions
   - Added proper logging of group permission changes
   - Implemented a cleanup mechanism to remove non-existent groups from module permissions

### Frontend Changes

1. **Updated Group Management UI**
   - Removed misleading warning message that permissions couldn't be changed
   - Updated `handleSaveGroup` function to send module permission updates to the backend
   - Added proper error handling and feedback for permission updates

2. **Group Creation and Editing Flow**
   - Updated the group creation flow to include module permission settings
   - Enhanced the editing flow to load and display current module permissions
   - Fixed issues with module toggle functionality

## Module Permission System

### How It Works

1. **Permissions Storage**
   - Module permissions are stored in `HasModulePermission.MODULE_GROUP_MAPPING` 
   - This mapping defines which groups can access which modules
   - Changes are persisted to `module_permissions.json` file
   - The file is loaded on server startup

2. **Group Access Control**
   - Each module has a list of groups that can access it
   - When a user attempts to access a module, their group membership is checked
   - Users in the "Admins" group or superusers have access to all modules

3. **Django Permission Integration**
   - Each module is mapped to specific Django permissions in `MODULE_PERMISSION_MAPPING`
   - When a group is assigned to a module, it receives all necessary Django permissions
   - When a group is removed from a module, its permissions for that module are revoked
   - This ensures that users in a group can actually perform actions within the module

4. **API Endpoints**
   - `GET /api/users/module-permissions/` - Returns the current module permission mapping
   - `POST /api/users/update-group-modules/` - Updates module permissions for a group

### Management Commands

A management command `cleanup_module_permissions` was added to help manage module permissions. It can:
- List current module permissions
- Clean up stale permissions (remove non-existent groups)
- Export permissions to a file
- Import permissions from a file

## Testing and Verification

The following tests were performed to verify the fixes:

1. **Module Permission Updates**
   - Created a new group and added module permissions via API
   - Verified that changes persisted after server restart
   - Updated module permissions and confirmed the changes were saved
   - Removed module permissions and confirmed they were removed

2. **Group Deletion**
   - Created a group with module permissions
   - Deleted the group
   - Verified that the group was removed from all module permissions

3. **Group Recreation**
   - Deleted a group with module permissions
   - Created a new group with the same name
   - Verified that the new group did not have any module permissions by default

## Usage Instructions

### Managing Module Permissions via UI

1. Go to the Group Management page
2. Create a new group or click "Edit" for an existing group
3. In the dialog, check or uncheck the modules this group should have access to
4. Click "Save" to apply the changes

### Managing Module Permissions via API

To update module permissions for a group:
```http
POST /api/users/update-group-modules/
Authorization: Token <your-token>
Content-Type: application/json

{
  "group_name": "Test Group",
  "modules": {
    "maintenance": true,
    "inventory": false,
    "sales": true,
    "expenses": false,
    "attendance": false,
    "buyers": false
  }
}
```

## Recommendations for Future Improvements

1. **Database Storage**
   - Consider storing module permissions in the database for better persistence
   - Implement database migrations and models for module permissions

2. **User Interface Enhancements**
   - Add real-time feedback when module permissions are updated
   - Improve the module permission UI with better organization and grouping

3. **Permission Auditing**
   - Implement logging of permission changes
   - Add an audit trail for permission modifications

4. **Permission Testing**
   - Add automated tests for the permission system
   - Create integration tests for the Group Management UI

## Conclusion

The implemented fixes address the issues with the Group Management module and ensure that module permissions are correctly saved and persisted. The changes provide a more robust and reliable way to manage group permissions in the IcePlant Management Portal.
