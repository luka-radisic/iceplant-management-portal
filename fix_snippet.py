"""
Simple direct fix for module permissions removal issue.
"""

# The direct edit we need to make to fix the module permissions removal:
# 1. Add direct permission removal code where module permissions are removed

edit_snippet = """
            # Remove group from module permissions if it's there
            if group_name in module_mapping[module]:
                module_mapping[module].remove(group_name)
                logger.info(f"Removed {group_name} from {module}")
                
                # DIRECT FIX: Explicitly remove all permissions for this module from the group
                try:
                    # Get the group object
                    group = Group.objects.get(name=group_name)
                    
                    # Get module permissions from the mapping
                    from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING
                    perm_names = MODULE_PERMISSION_MAPPING.get(module, [])
                    
                    # Remove each permission directly
                    for perm_name in perm_names:
                        try:
                            app_label, codename = perm_name.split('.')
                            perm = Permission.objects.get(
                                content_type__app_label=app_label,
                                codename=codename
                            )
                            if perm in group.permissions.all():
                                group.permissions.remove(perm)
                                logger.info(f"Directly removed {perm_name} from {group_name}")
                        except Exception as e:
                            logger.error(f"Error removing {perm_name}: {e}")
                except Exception as e:
                    logger.error(f"Error directly removing permissions: {e}")
"""

print("Copy and paste this edit into the API views file where module permissions are removed.")
print("\nWhere to add it:")
print("1. Open '/app/iceplant_portal/users/api_views_groups.py'")
print("2. Find the 'update_group_module_permissions' function")
print("3. Look for the code that removes groups from module permissions")
print("4. Replace that section with this code\n")
print(edit_snippet)
