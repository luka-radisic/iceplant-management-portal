# Fix for backend Django URL configuration

import os
import shutil

# Path to the django app directory - adjust this to match your setup
base_dir = 'c:/Users/Lukar/Documents/CMA-PH/iceplant-management-portal/iceplant_portal'

def backup_file(file_path):
    """Create a backup of a file before modifying it"""
    backup_path = file_path + '.bak-fix'
    shutil.copy2(file_path, backup_path)
    print(f'Created backup at {backup_path}')

# 1. Fix api_views.py file - rename the duplicate GroupViewSet class
api_views_path = os.path.join(base_dir, 'users', 'api_views.py')
if os.path.exists(api_views_path):
    backup_file(api_views_path)
    
    with open(api_views_path, 'r') as f:
        content = f.read()
    
    # Check if file already contains UserPermissionsGroupViewSet before replacing
    if 'class GroupViewSet(' in content and 'class UserPermissionsGroupViewSet(' not in content:
        content = content.replace('class GroupViewSet(', 'class UserPermissionsGroupViewSet(')
        
        with open(api_views_path, 'w') as f:
            f.write(content)
        print(f'Renamed GroupViewSet to UserPermissionsGroupViewSet in {api_views_path}')

# 2. Ensure URLs file is using the correct class import
urls_path = os.path.join(base_dir, 'users', 'urls.py')
if os.path.exists(urls_path):
    backup_file(urls_path)
    
    with open(urls_path, 'r') as f:
        content = f.read()
    
    # Add clarifying comment to groups_router registration
    if "groups_router.register(r'groups', GroupViewSet)" in content and "# This is from api_views_groups.py" not in content:
        content = content.replace(
            "groups_router.register(r'groups', GroupViewSet)",
            "groups_router.register(r'groups', GroupViewSet)  # This is from api_views_groups.py"
        )
        
        with open(urls_path, 'w') as f:
            f.write(content)
        print(f'Updated URL registration in {urls_path}')

print('Fix completed. Try starting the Django server now.')
