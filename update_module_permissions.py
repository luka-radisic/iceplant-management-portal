"""
Script to check and update the HasModulePermission class to ensure
the 'Admins' group has access to all modules.
"""

# Try to import the HasModulePermission class
try:
    from iceplant_core.group_permissions import HasModulePermission
    
    # Check the current MODULE_GROUP_MAPPING
    print("Current MODULE_GROUP_MAPPING:")
    for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
        print(f"  - {module}: {groups}")
        
        # Add 'Admins' group to each module if not already present
        if 'Admins' not in groups:
            HasModulePermission.MODULE_GROUP_MAPPING[module].append('Admins')
            print(f"    Added 'Admins' to {module} module")
    
    # Print updated mapping
    print("\nUpdated MODULE_GROUP_MAPPING:")
    for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
        print(f"  - {module}: {groups}")
        
except (ImportError, AttributeError) as e:
    print(f"Error: {e}")
