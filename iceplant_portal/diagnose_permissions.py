"""
Utility script to diagnose module permission issues.
"""
from django.contrib.auth.models import Group, Permission
from django.core.management import call_command

def list_all_groups_with_permissions():
    """
    List all groups with their permissions.
    """
    groups = Group.objects.all()
    
    print("=== Groups and Their Permissions ===")
    for group in groups:
        print(f"\nGroup: {group.name}")
        permissions = group.permissions.all()
        if permissions.exists():
            print("  Permissions:")
            for perm in permissions:
                print(f"    - {perm.content_type.app_label}.{perm.codename} ({perm.name})")
        else:
            print("  No permissions assigned")

def list_module_permissions_mapping():
    """
    List the module permission mapping.
    """
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions import MODULE_PERMISSION_MAPPING
    
    print("\n=== Module to Group Mapping ===")
    for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
        print(f"\nModule: {module}")
        if groups:
            print(f"  Groups with access: {', '.join(groups)}")
        else:
            print("  No groups have access")
    
    print("\n=== Module to Django Permissions Mapping ===")
    for module, perms in MODULE_PERMISSION_MAPPING.items():
        print(f"\nModule: {module}")
        if perms:
            print("  Required permissions:")
            for app_label, codename in perms:
                print(f"    - {app_label}.{codename}")
        else:
            print("  No permissions required")

def sync_module_permissions():
    """
    Sync module permissions with Django permissions.
    """
    from iceplant_core.module_permissions import sync_all_module_permissions
    
    print("\n=== Syncing Module Permissions ===")
    result = sync_all_module_permissions()
    
    if result:
        print("Successfully synchronized module permissions")
    else:
        print("Failed to synchronize module permissions")

if __name__ == "__main__":
    list_all_groups_with_permissions()
    list_module_permissions_mapping()
    sync_module_permissions()
    # List groups again after sync to see changes
    list_all_groups_with_permissions()
