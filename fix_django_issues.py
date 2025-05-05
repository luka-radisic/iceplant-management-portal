"""
Script to fix Django URL configuration issues and duplicate GroupViewSet definitions

This script:
1. Fixes duplicate imports in api_views.py
2. Renames the duplicate GroupViewSet in api_views.py
3. Updates URL configuration in users/urls.py to use the correct classes
4. Checks for any additional imports that might be causing issues
"""

import os
import re
import shutil
import sys

def backup_file(file_path):
    """Create backup of a file"""
    backup_path = file_path + '.bak'
    shutil.copy2(file_path, backup_path)
    print(f"Created backup at {backup_path}")

def fix_api_views_file(file_path):
    """Fix duplicate imports and class names in api_views.py"""
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False
    
    backup_file(file_path)
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace duplicate file header if exists
    content = re.sub(r'# filepath:.*?\n# filepath:.*?\n', '# filepath: ' + file_path + '\n', content)
    
    # Rename the GroupViewSet class to avoid conflict with api_views_groups.py
    content = re.sub(
        r'class GroupViewSet\(viewsets\.ModelViewSet\):',
        'class UserPermissionsGroupViewSet(viewsets.ModelViewSet):',
        content
    )
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Fixed {file_path}")
    return True

def fix_urls_file(file_path):
    """Fix URL configurations in urls.py to use the correct classes"""
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False
    
    backup_file(file_path)
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Update import statements to be more explicit
    content = re.sub(
        r'from \.api_views_groups import GroupViewSet, UserManagementViewSet, module_group_mapping',
        '# Import explicitly from api_views_groups to avoid confusion\nfrom .api_views_groups import GroupViewSet, UserManagementViewSet, module_group_mapping',
        content
    )
    
    # Add comment to groups_router registration to clarify which file it's coming from
    content = re.sub(
        r"groups_router\.register\(r'groups', GroupViewSet\)",
        "groups_router.register(r'groups', GroupViewSet)  # This is from api_views_groups.py",
        content
    )
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Fixed {file_path}")
    return True

def main():
    """Main function to fix all identified issues"""
    base_path = r'c:\Users\Lukar\Documents\CMA-PH\iceplant-management-portal\iceplant_portal'
    
    files_to_fix = {
        'api_views': os.path.join(base_path, 'users', 'api_views.py'),
        'urls': os.path.join(base_path, 'users', 'urls.py'),
    }
    
    print("Starting to fix URL configuration and class name conflicts...")
    
    fix_api_views_file(files_to_fix['api_views'])
    fix_urls_file(files_to_fix['urls'])
    
    print("Fixes completed. Try restarting the Django server.")

if __name__ == "__main__":
    main()
