# Module Permissions Quick Reference Guide

## Overview

This guide provides a quick reference for managing module permissions in the Iceplant Management Portal after the implementation of the comprehensive module permissions fix.

## For Administrators

### Managing Module Permissions via Frontend

1. **Access Group Management**
   - Navigate to **Administration > Group Management**
   - Select a group to manage

2. **Update Module Permissions**
   - In the group details view, find the **Module Permissions** section
   - Toggle access for each module as needed
   - Click **Save** to apply changes

3. **Verify Changes**
   - Changes should be immediately visible in the UI
   - Users in the affected group will have updated access
   - Changes will persist across server restarts

### Managing Module Permissions via Django Admin

1. **Access Django Admin**
   - Navigate to `/admin/` and login with admin credentials

2. **Update Group Permissions**
   - Go to **Authentication and Authorization > Groups**
   - Select the group you want to modify
   - Add or remove module permissions:
     - Look for permissions with the format `iceplant_core | modulepermission | Can access X module`
     - Example: `iceplant_core | modulepermission | Can access attendance module`
   - Click **Save** to apply changes

### Synchronizing Permissions (Admin Only)

If you suspect permissions are out of sync, use the management command:

```bash
# For all groups
python manage.py sync_module_permissions

# For a specific group
python manage.py sync_module_permissions --group "Group Name"
```

### Common Issues and Solutions

#### Permissions Not Showing in Django Admin

**Solution**: Run the sync command for the specific group:
```bash
python manage.py sync_module_permissions --group "Group Name"
```

#### Permissions Not Persisting After Restart

**Solution**: Check that module_permissions.json files exist and are writable:
1. In the root directory
2. In the iceplant_portal directory
3. In the iceplant_portal/iceplant_core directory

#### Users Can't Access Modules They Should Have Access To

**Solution**:
1. Verify the user is assigned to the correct group
2. Check that the group has the proper module permissions
3. Sync the permissions if needed

## For Users

### Understanding Module Access

Your access to modules in the Iceplant Management Portal is determined by:
1. The groups you belong to
2. The module permissions assigned to those groups

### Reporting Access Issues

If you cannot access a module you believe you should have access to:

1. Verify you're trying to access the correct module
2. Log out and log back in to refresh your permissions
3. Contact your system administrator with the following information:
   - Your username
   - The module you're trying to access
   - The group(s) you belong to
   - Any error messages you see

## For Developers

### Architecture Overview

The module permissions system now consists of:

1. **HasModulePermission Class**
   - Handles module-level access control
   - Uses in-memory mapping of modules to groups

2. **Django Permissions**
   - Standard Django permission objects
   - Created for each module
   - Visible in the Django admin interface

3. **Synchronization System**
   - Connects the custom system with Django permissions
   - Ensures both systems stay in sync

### Adding New Modules

When adding a new module:

1. Ensure your module is registered in the HasModulePermission system
2. Run the sync command to create the Django permission:
   ```bash
   python manage.py sync_module_permissions
   ```

3. Assign the permission to appropriate groups

### File Locations

Module permissions are stored in:
- `/module_permissions.json`
- `/iceplant_portal/module_permissions.json`
- `/iceplant_portal/iceplant_core/module_permissions.json`
