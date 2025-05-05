"""
Script to fix module permissions in the django backend when groups are updated or deleted
"""
from django.contrib.auth.models import Group
from iceplant_core.group_permissions import HasModulePermission
import json

def cleanup_module_permissions():
    """
    Clean up module permissions to make sure deleted groups are removed
    and print the current state of module permissions
    """
    print("Cleaning up module permissions...")
    
    # Get all existing group names
    existing_groups = set(Group.objects.values_list('name', flat=True))
    
    # Clean up MODULE_GROUP_MAPPING
    module_mapping = HasModulePermission.MODULE_GROUP_MAPPING
    modified = False
    
    for module, groups in module_mapping.items():
        # Filter out groups that no longer exist
        valid_groups = [g for g in groups if g in existing_groups]
        
        if len(valid_groups) != len(groups):
            module_mapping[module] = valid_groups
            modified = True
    
    if modified:
        print("Module permissions were cleaned up.")
    else:
        print("No cleanup needed.")
    
    # Print the current state of module permissions
    print("\nCurrent module permissions:")
    print(json.dumps(module_mapping, indent=2))
    
    return module_mapping

if __name__ == "__main__":
    cleanup_module_permissions()
