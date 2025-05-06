"""
Full fix for module permissions system to ensure consistent parameter order
and function behavior across all code.
"""

import os
import sys
import django
import inspect
import re

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def fix_module_permissions_system():
    """
    Fix the module permissions system to ensure consistent parameter order
    """
    # Check module_permissions.py first
    try:
        import iceplant_core.module_permissions
        module_file = inspect.getfile(iceplant_core.module_permissions)
        
        with open(module_file, 'r') as f:
            content = f.read()
            
        # Check parameter order
        pattern = r'def remove_module_permissions_from_group\(group_name, module_name\)'
        if re.search(pattern, content):
            logger.info("Found incorrect parameter order in module_permissions.py")
            
            # Fix parameter order
            fixed_content = re.sub(
                pattern,
                'def remove_module_permissions_from_group(module_name, group_name)',
                content
            )
            
            # Also fix the function body
            fixed_content = re.sub(
                r'logger.info\(f"Removed {len\(permissions\)} permissions for module {module_name} from group {group_name}"\)',
                'logger.info(f"Removed {len(permissions)} permissions for module {module_name} from group {group_name}")',
                fixed_content
            )
            
            if fixed_content != content:
                with open(module_file, 'w') as f:
                    f.write(fixed_content)
                    
                logger.info(f"Fixed parameter order in {module_file}")
            else:
                logger.info(f"No changes needed in {module_file}")
        else:
            logger.info(f"Parameter order in {module_file} appears correct")
    except Exception as e:
        logger.error(f"Error checking module_permissions.py: {e}")
    
    # Create a utility function to ensure consistent function calling
    try:
        from django.contrib.auth.models import Group, Permission
        import iceplant_core.module_permissions_utils as utils
        
        # Create a wrapper function that adapts the parameter order
        def fix_remove_module_permissions(module_name, group_name):
            """
            Wrapper to ensure correct parameter order when calling remove_module_permissions_from_group
            """
            return utils.remove_module_permissions_from_group(module_name, group_name)
        
        # Test this function on a test group
        test_group_name = "ParameterOrderTestGroup"
        module_name = "buyers"
        
        try:
            # Create test group if it doesn't exist
            group, created = Group.objects.get_or_create(name=test_group_name)
            if created:
                logger.info(f"Created test group '{test_group_name}'")
            else:
                logger.info(f"Using existing test group '{test_group_name}'")
                
            # First assign permissions to test removal
            utils.assign_module_permissions_to_group(module_name, test_group_name)
            
            # Now call our wrapper function
            fix_remove_module_permissions(module_name, test_group_name)
            
            # Verify permissions were removed
            group = Group.objects.get(name=test_group_name)
            remaining_perms = [p for p in group.permissions.all() 
                               if p.content_type.app_label == module_name]
            
            if remaining_perms:
                logger.error(f"ERROR: {len(remaining_perms)} {module_name} permissions remain!")
            else:
                logger.info(f"SUCCESS: All {module_name} permissions removed correctly")
        except Exception as e:
            logger.error(f"Error testing wrapper function: {e}")
    except Exception as e:
        logger.error(f"Error creating wrapper function: {e}")
    
    # Check api_views_groups.py to make sure it's calling the function correctly
    try:
        import users.api_views_groups
        api_views_file = inspect.getfile(users.api_views_groups)
        
        with open(api_views_file, 'r') as f:
            content = f.read()
        
        # Check if there's any instance of calling with wrong parameter order
        wrong_pattern = r'remove_module_permissions_from_group\(group_name,\s*module'
        if re.search(wrong_pattern, content):
            logger.info(f"Found incorrect parameter order in {api_views_file}")
            
            # Fix all instances of wrong parameter order
            fixed_content = re.sub(
                wrong_pattern,
                'remove_module_permissions_from_group(module, group_name',
                content
            )
            
            if fixed_content != content:
                with open(api_views_file, 'w') as f:
                    f.write(fixed_content)
                    
                logger.info(f"Fixed parameter order in {api_views_file}")
            else:
                logger.info(f"No changes needed in {api_views_file}")
        else:
            logger.info(f"Parameter order in {api_views_file} appears correct")
    except Exception as e:
        logger.error(f"Error checking api_views_groups.py: {e}")

if __name__ == "__main__":
    logger.info("Starting module permissions system fix...")
    fix_module_permissions_system()
    logger.info("Done!")
