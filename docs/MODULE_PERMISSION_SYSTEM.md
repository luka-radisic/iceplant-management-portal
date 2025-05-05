# Module Permission System Technical Documentation

## Overview

The Module Permission System in the IcePlant Management Portal provides a way to control access to different modules based on user groups. The system maps high-level "module access" to specific Django permissions, ensuring that groups with access to a module automatically receive all the necessary Django permissions to work with that module.

## Architecture

The system has two main components:

1. **Module-Group Mapping**: Defines which groups have access to which modules
2. **Module-Permission Mapping**: Maps each module to specific Django permissions

## Module-Group Mapping

The module-group mapping is stored in `HasModulePermission.MODULE_GROUP_MAPPING`:

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

This mapping is persisted to disk in `module_permissions.json` and loaded on startup.

## Module-Permission Mapping

Each module is mapped to specific Django permissions using the `MODULE_PERMISSION_MAPPING`:

```python
MODULE_PERMISSION_MAPPING = {
    'attendance': [
        'attendance.view_attendancerecord',
        'attendance.add_attendancerecord',
        'attendance.change_attendancerecord',
        'attendance.delete_attendancerecord',
    ],
    'sales': [
        'sales.view_sale',
        'sales.add_sale',
        'sales.change_sale',
        'sales.delete_sale',
    ],
    # ... other modules
}
```

## Permission Flow

When a group is assigned to a module:

1. The group is added to the module in `MODULE_GROUP_MAPPING`
2. All Django permissions for that module are assigned to the group

When a group is removed from a module:

1. The group is removed from the module in `MODULE_GROUP_MAPPING`
2. All Django permissions for that module are revoked from the group

## Synchronization Process

The system ensures that the module permissions and Django permissions are synchronized:

1. **On Server Startup**: The system loads the module permissions from disk and synchronizes Django permissions
2. **On Group Creation/Update**: When groups are created or updated, the system updates both module permissions and Django permissions
3. **On Group Deletion**: When a group is deleted, it's automatically removed from all module permissions

## Handling Missing Permissions

If permissions for a module don't exist in Django (e.g., the models haven't been created yet), warnings are logged, but the system continues to operate with the available permissions.

## Implementation Details

### Module Permission Assignment

```python
def assign_module_permissions_to_group(module, group_name):
    """
    Assign all permissions for a module to a group
    """
    try:
        group = Group.objects.get(name=group_name)
        permissions_assigned = 0
        
        # Get permissions for this module
        module_permissions = MODULE_PERMISSION_MAPPING.get(module, [])
        
        for permission_name in module_permissions:
            try:
                app_label, codename = permission_name.split('.')
                permission = Permission.objects.get(
                    content_type__app_label=app_label,
                    codename=codename
                )
                group.permissions.add(permission)
                permissions_assigned += 1
            except Permission.DoesNotExist:
                logger.warning(f"Permission {permission_name} does not exist")
        
        if permissions_assigned == 0 and module_permissions:
            logger.warning(f"No permissions found for module {module}")
        else:
            logger.info(f"Assigned {permissions_assigned} permissions for module {module} to group {group_name}")
            
    except Group.DoesNotExist:
        logger.warning(f"Group {group_name} does not exist")
```

### Module Permission Removal

```python
def remove_module_permissions_from_group(module, group_name):
    """
    Remove all permissions for a module from a group
    """
    try:
        group = Group.objects.get(name=group_name)
        permissions_removed = 0
        
        # Get permissions for this module
        module_permissions = MODULE_PERMISSION_MAPPING.get(module, [])
        
        for permission_name in module_permissions:
            try:
                app_label, codename = permission_name.split('.')
                permission = Permission.objects.get(
                    content_type__app_label=app_label,
                    codename=codename
                )
                group.permissions.remove(permission)
                permissions_removed += 1
            except Permission.DoesNotExist:
                logger.warning(f"Permission {permission_name} does not exist")
        
        if permissions_removed > 0:
            logger.info(f"Removed {permissions_removed} permissions for module {module} from group {group_name}")
            
    except Group.DoesNotExist:
        logger.warning(f"Group {group_name} does not exist")
```

## Troubleshooting

### Missing Permissions

When you see warnings like:

```
WARNING Permission inventory.view_inventoryitem does not exist
```

It means:

1. The permission definition in `MODULE_PERMISSION_MAPPING` doesn't match the actual permission in the database
2. The permission hasn't been created in the database yet

**Solution**:

1. Ensure that models for the module have been properly registered with Django admin
2. Run migrations to create all necessary permissions
3. Update the `MODULE_PERMISSION_MAPPING` to match the actual permissions in the database

### Permission Sync Issues

If you see that a group has access to a module but users in that group still can't access the module:

1. Check if the group actually has the necessary Django permissions:
   ```python
   group = Group.objects.get(name='Test Group')
   group.permissions.all()  # Should show all permissions for the modules
   ```

2. Verify the user is actually in the group:
   ```python
   user = User.objects.get(username='testuser')
   user.groups.all()  # Should include the group
   ```

3. Run the permission synchronization:
   ```bash
   python manage.py sync_module_permissions
   ```

## Best Practices

1. **Always use the API**: Use the `update_group_module_permissions` API to update module permissions, don't modify the `MODULE_GROUP_MAPPING` directly

2. **Keep mappings in sync**: Ensure that the `MODULE_PERMISSION_MAPPING` correctly reflects the actual permissions in your Django models

3. **Regularly sync permissions**: If you add new models or permissions, update the `MODULE_PERMISSION_MAPPING` and run the sync command

4. **Monitor warnings**: Check logs for warnings about missing permissions and fix them by updating models or mappings
