# Module Permissions Django Shell Commands

If you encounter issues running the automated scripts, you can use these Django shell commands to manually fix permissions.

## 1. Access Django Shell

```bash
# Using manage.py
python iceplant_portal/manage.py shell

# Or with Docker
docker-compose exec web python manage.py shell
```

## 2. Create Content Type for Module Permissions

```python
# In the Django shell
from django.contrib.contenttypes.models import ContentType

# Create content type if it doesn't exist
ct, created = ContentType.objects.get_or_create(
    app_label='iceplant_core',
    model='modulepermission'
)
print(f"Content type created: {created}")
print(f"Content type: {ct}")
```

## 3. Create Permissions for Modules

```python
# In the Django shell
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

# Get the content type
ct = ContentType.objects.get(app_label='iceplant_core', model='modulepermission')

# Create permissions for modules
modules = ['attendance', 'sales', 'inventory', 'expenses', 'maintenance', 'buyers']

for module in modules:
    codename = f"access_{module}_module"
    name = f"Can access {module} module"
    
    perm, created = Permission.objects.get_or_create(
        content_type=ct,
        codename=codename,
        defaults={'name': name}
    )
    print(f"Permission for {module}: {perm.codename} - Created: {created}")
```

## 4. Fix HR Payrol Permissions

```python
# In the Django shell
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType

# Get HR Payrol group
hr_payrol = Group.objects.get(name='HR Payrol')
print(f"Found HR Payrol group: {hr_payrol}")

# Get content type
ct = ContentType.objects.get(app_label='iceplant_core', model='modulepermission')

# Get permissions for attendance and expenses
attendance_perm = Permission.objects.get(content_type=ct, codename='access_attendance_module')
expenses_perm = Permission.objects.get(content_type=ct, codename='access_expenses_module')

# Add permissions to group
hr_payrol.permissions.add(attendance_perm)
hr_payrol.permissions.add(expenses_perm)

print("Permissions added to HR Payrol group")

# Verify
print("HR Payrol permissions:")
for perm in hr_payrol.permissions.filter(content_type=ct):
    print(f"- {perm.codename}: {perm.name}")
```

## 5. Synchronize HasModulePermission with Django Permissions

```python
# In the Django shell
from iceplant_core.group_permissions import HasModulePermission
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
import json
import os

# Get the module mapping
module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
print(f"Found {len(module_mapping)} modules in HasModulePermission")

# Get content type for module permissions
ct = ContentType.objects.get(app_label='iceplant_core', model='modulepermission')

# For each group, update Django permissions based on module mapping
for group_name in Group.objects.values_list('name', flat=True):
    group = Group.objects.get(name=group_name)
    print(f"\nUpdating permissions for group: {group_name}")
    
    # Get all module permissions the group should have
    modules_with_access = []
    for module, allowed_groups in module_mapping.items():
        if group_name in allowed_groups:
            modules_with_access.append(module)
    
    print(f"Group should have access to modules: {modules_with_access}")
    
    # Clear existing module permissions
    existing_perms = group.permissions.filter(content_type=ct)
    group.permissions.remove(*existing_perms)
    
    # Add correct permissions
    for module in modules_with_access:
        perm = Permission.objects.get(content_type=ct, codename=f"access_{module}_module")
        group.permissions.add(perm)
        print(f"  Added permission: {perm.codename}")
    
    # Verify
    print(f"  Final permissions: {group.permissions.filter(content_type=ct).count()}")

print("\nSynchronization complete")
```

## 6. Save Module Permissions to Disk

```python
# In the Django shell
from iceplant_core.group_permissions import HasModulePermission
import json
import os

# Places to save
locations = [
    "module_permissions.json",
    os.path.join("iceplant_portal", "module_permissions.json"),
    os.path.join("iceplant_portal", "iceplant_core", "module_permissions.json")
]

# Get the module mapping
module_mapping = HasModulePermission.MODULE_GROUP_MAPPING

# Save to each location
for location in locations:
    abs_path = os.path.abspath(location)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    
    # Save the file
    with open(abs_path, 'w') as f:
        json.dump(module_mapping, f, indent=2)
    
    print(f"Saved module permissions to {abs_path}")

print("Module permissions saved to all locations")
```

## 7. Complete System Reset (Use With Caution)

```python
# In the Django shell
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from iceplant_core.group_permissions import HasModulePermission
from iceplant_core.module_permissions_system import initialize_module_permission_system

print("Performing complete module permissions system reset")

# Get content type for module permissions
ct, created = ContentType.objects.get_or_create(app_label='iceplant_core', model='modulepermission')
print(f"Content type: {ct}")

# Delete all existing module permissions
Permission.objects.filter(content_type=ct).delete()
print("Deleted all existing module permissions")

# Initialize the system from scratch
initialize_module_permission_system()
print("Module permissions system reinitialized")

print("Reset complete")
```
