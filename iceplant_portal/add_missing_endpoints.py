"""
Script to create API endpoints for the group management system.
This script will:
1. Create URLs for the module-permissions endpoint
2. Ensure the groups endpoint is properly configured
"""

# Import required Django modules
from django.urls import path
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.models import Group
from iceplant_core.group_permissions import HasModulePermission

# Function to get module permissions mapping
@api_view(['GET'])
def module_permissions(request):
    """Return the mapping of modules to allowed groups."""
    return Response(HasModulePermission.MODULE_GROUP_MAPPING)

# Check if the URLs are registered correctly
def check_urls():
    from django.urls import get_resolver
    resolver = get_resolver()
    
    # Print all available URL patterns
    def find_pattern(pattern, urllist):
        for entry in urllist:
            if hasattr(entry, 'pattern'):
                url = str(entry.pattern)
                if pattern in url:
                    return True
                if hasattr(entry, 'url_patterns'):
                    if find_pattern(pattern, entry.url_patterns):
                        return True
        return False
    
    module_perms_exists = find_pattern('module-permissions', resolver.url_patterns)
    groups_exists = find_pattern('groups', resolver.url_patterns)
    
    print(f"URL for module-permissions exists: {module_perms_exists}")
    print(f"URL for groups exists: {groups_exists}")
    
    # Return info for potential fixes
    return {"module_perms_exists": module_perms_exists, "groups_exists": groups_exists}

# Update the urls.py file if needed
def add_missing_urls():
    import os
    
    # Check if the users/urls.py file exists
    users_urls_path = os.path.join(os.path.dirname(__file__), 'users', 'urls.py')
    if not os.path.exists(users_urls_path):
        print(f"Error: Could not find {users_urls_path}")
        return False
    
    with open(users_urls_path, 'r') as f:
        content = f.read()
    
    # Check if module-permissions is already in the file
    if 'module-permissions' not in content:
        # Add the new URL pattern
        pattern = "path('me/permissions/', UserPermissionsView.as_view(), name='user-permissions'),"
        new_pattern = "path('module-permissions/', module_permissions, name='module-permissions'),"
        
        # Insert the new pattern after the existing one
        content = content.replace(pattern, pattern + "\n    " + new_pattern)
        
        # Add the import for module_permissions
        if 'from .views import module_permissions' not in content:
            # Find the imports section
            import_section = content.split('\n\n')[0]
            if 'from .views import' in import_section:
                # Add to existing import
                content = content.replace('from .views import', 'from .views import module_permissions, ')
            else:
                # Add new import line
                content = "from .views import module_permissions\n" + content
        
        # Write the updated file
        with open(users_urls_path, 'w') as f:
            f.write(content)
        
        print(f"Added module-permissions URL to {users_urls_path}")
    else:
        print(f"module-permissions URL is already in {users_urls_path}")
    
    # Check if the users/views.py file exists
    users_views_path = os.path.join(os.path.dirname(__file__), 'users', 'views.py')
    if not os.path.exists(users_views_path):
        print(f"Error: Could not find {users_views_path}")
        return False
    
    with open(users_views_path, 'r') as f:
        content = f.read()
    
    # Check if module_permissions function is already in the file
    if 'def module_permissions' not in content:
        # Add the new function
        function_code = """
@api_view(['GET'])
def module_permissions(request):
    \"\"\"Return the mapping of modules to allowed groups.\"\"\"
    from iceplant_core.group_permissions import HasModulePermission
    return Response(HasModulePermission.MODULE_GROUP_MAPPING)
"""
        # Add to the end of the file
        content += "\n" + function_code
        
        # Check if imports are needed
        if 'from rest_framework.decorators import api_view' not in content:
            content = "from rest_framework.decorators import api_view\n" + content
        if 'from rest_framework.response import Response' not in content:
            content = "from rest_framework.response import Response\n" + content
        
        # Write the updated file
        with open(users_views_path, 'w') as f:
            f.write(content)
        
        print(f"Added module_permissions function to {users_views_path}")
    else:
        print(f"module_permissions function is already in {users_views_path}")
    
    return True

if __name__ == "__main__":
    print("Group Management API Endpoints Tool")
    print("==================================")
    
    # Check if URLs exist
    url_info = check_urls()
    
    # Add missing URLs if needed
    if not url_info["module_perms_exists"] or not url_info["groups_exists"]:
        print("\nAdding missing URLs...")
        add_missing_urls()
    else:
        print("\nAll required URLs are already set up.")
    
    print("\nTo test the endpoints, you can use:")
    print("  1. http://localhost:8000/api/users/module-permissions/")
    print("  2. http://localhost:8000/api/users/groups/")
    print("\nRestart your Django server for changes to take effect.")
