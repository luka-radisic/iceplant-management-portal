"""
Final fix for module permission removal
"""

import os
import sys
import django
import inspect

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

import logging
from django.contrib.auth.models import Group, Permission

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def debug_permissions_removal():
    """Debug permissions removal and output the correct function call"""
    
    # First, get the module_permissions_utils implementation
    from iceplant_core.module_permissions_utils import remove_module_permissions_from_group as utils_remove
    
    # Then, get the module_permissions implementation 
    try:
        from iceplant_core.module_permissions import remove_module_permissions_from_group as module_remove
        module_impl_exists = True
    except ImportError:
        module_impl_exists = False
    
    # Show which implementations are available
    logger.info(f"module_permissions_utils implementation: {utils_remove}")
    if module_impl_exists:
        logger.info(f"module_permissions implementation: {module_remove}")
    else:
        logger.info("No module_permissions implementation found")
    
    # Check implementations signature through inspect
    utils_sig = inspect.signature(utils_remove)
    logger.info(f"utils_remove signature: {utils_sig}")
    
    if module_impl_exists:
        module_sig = inspect.signature(module_remove)
        logger.info(f"module_remove signature: {module_sig}")
    
    # Create a test case
    test_group_name = "PermissionsTestGroup"
    module_name = "buyers"
    
    # First assign permissions
    logger.info(f"Assigning {module_name} permissions to {test_group_name}")
    
    # Get the proper module permissions
    try:
        from iceplant_core.module_permissions_utils import MODULE_PERMISSION_MAPPING
        perm_names = MODULE_PERMISSION_MAPPING.get(module_name, [])
        logger.info(f"Module {module_name} permissions: {perm_names}")
        
        # Get the group
        try:
            group = Group.objects.get(name=test_group_name)
            
            # Assign each permission directly
            for perm_name in perm_names:
                try:
                    app_label, codename = perm_name.split('.')
                    perm = Permission.objects.get(
                        content_type__app_label=app_label,
                        codename=codename
                    )
                    group.permissions.add(perm)
                    logger.info(f"Added {perm_name} to {test_group_name}")
                except Exception as e:
                    logger.error(f"Error assigning {perm_name}: {e}")
        except Group.DoesNotExist:
            logger.error(f"Group {test_group_name} does not exist")
    except Exception as e:
        logger.error(f"Error getting permissions: {e}")
    
    # Now try to remove permissions using the direct function call
    logger.info(f"Removing {module_name} permissions from {test_group_name}")
    
    # Insert debug tracing code
    import sys
    def trace_calls(frame, event, arg):
        if event != 'call':
            return
        co = frame.f_code
        func_name = co.co_name
        if func_name in ['remove_module_permissions_from_group']:
            func_filename = co.co_filename
            logger.info(f"Call to {func_name} in {func_filename}")
            logger.info(f"Args: {frame.f_locals}")
        return trace_calls
    
    sys.settrace(trace_calls)
    try:
        # First try the utils implementation
        utils_remove(module_name, test_group_name)
        sys.settrace(None)
        
        # Now verify permissions were removed
        group = Group.objects.get(name=test_group_name)
        remaining = [p for p in group.permissions.all() 
                    if p.content_type.app_label == module_name]
        
        if remaining:
            logger.error(f"ERROR: {len(remaining)} {module_name} permissions remain!")
            for perm in remaining:
                logger.error(f"  - {perm.content_type.app_label}.{perm.codename}")
        else:
            logger.info(f"SUCCESS: All {module_name} permissions removed")
    except Exception as e:
        sys.settrace(None)
        logger.error(f"Error in removal: {e}")
    
    # Finally, let's directly modify the API views module to ensure it calls the right function
    try:
        import users.api_views_groups
        api_views_file = inspect.getfile(users.api_views_groups)
        
        with open(api_views_file, 'r') as f:
            content = f.read()
        
        # Replace the remove_module_permissions_from_group call
        import re
        
        # Define the pattern to match the function call with parameters
        pattern = r'remove_module_permissions_from_group\((.*?),\s*(.*?)\)'
        
        # Debugging patterns
        all_calls = re.findall(pattern, content)
        logger.info(f"Found function calls: {all_calls}")
        
        # Make replacements, swapping parameter order where needed
        def replace_func(match):
            args = match.groups()
            if len(args) == 2:
                param1, param2 = args
                # If first param is group_name and second is module, swap them
                if 'group' in param1 and 'module' in param2:
                    return f'remove_module_permissions_from_group({param2}, {param1})'
                # Otherwise keep as-is
                return match.group(0)
            return match.group(0)
        
        # Replace all occurrences
        fixed_content = re.sub(pattern, replace_func, content)
        
        # Write back if changed
        if fixed_content != content:
            with open(api_views_file, 'w') as f:
                f.write(fixed_content)
            logger.info(f"Fixed parameter order in {api_views_file}")
        else:
            logger.info(f"No changes needed in {api_views_file}")
            
    except Exception as e:
        logger.error(f"Error fixing API views: {e}")
        
    # For the module_permissions.py file
    try:
        import iceplant_core.module_permissions
        mod_file = inspect.getfile(iceplant_core.module_permissions)
        
        with open(mod_file, 'r') as f:
            content = f.read()
            
        # Look for remove_module_permissions_from_group function
        pattern = r'def remove_module_permissions_from_group\((.*?),\s*(.*?)\):'
        
        matches = re.findall(pattern, content)
        logger.info(f"Function signatures in {mod_file}: {matches}")
        
        # Fix parameter order if needed
        fixed_content = re.sub(
            r'def remove_module_permissions_from_group\(group_name, module_name\):',
            'def remove_module_permissions_from_group(module_name, group_name):',
            content
        )
        
        if fixed_content != content:
            with open(mod_file, 'w') as f:
                f.write(fixed_content)
            logger.info(f"Fixed function signature in {mod_file}")
        else:
            logger.info(f"No changes needed in {mod_file}")
    except Exception as e:
        logger.error(f"Error fixing module_permissions.py: {e}")

if __name__ == "__main__":
    logger.info("Debugging module permissions removal...")
    debug_permissions_removal()
    logger.info("Done!")
