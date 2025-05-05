"""
Script to validate and fix permission class usage in the maintenance app.
"""

import os
import sys
import re
import shutil

def check_and_fix_maintenance_permissions():
    """
    Validate the permission class usage in maintenance views.py
    and fix it if necessary.
    """
    # Path to the maintenance views.py file
    views_path = '/app/iceplant_portal/maintenance/views.py'
    
    if not os.path.exists(views_path):
        print(f"Error: Could not find {views_path}")
        return False
    
    # Create a backup
    backup_path = views_path + '.bak'
    shutil.copy2(views_path, backup_path)
    print(f"Created backup at {backup_path}")
    
    # Read the contents
    with open(views_path, 'r') as file:
        content = file.read()
    
    # Check for proper permission class usage
    permission_pattern = r'permission_classes\s*=\s*\[IsAuthenticated,\s*HasModulePermission\(\'maintenance\'\)\]'
    if not re.search(permission_pattern, content):
        print("Warning: HasModulePermission may not be properly instantiated")
        
        # Fix the permission class usage if needed
        fixed_content = re.sub(
            r'permission_classes\s*=\s*\[IsAuthenticated,\s*HasModulePermission\]',
            "permission_classes = [IsAuthenticated, HasModulePermission('maintenance')]",
            content
        )
        
        if fixed_content != content:
            with open(views_path, 'w') as file:
                file.write(fixed_content)
            print("Fixed HasModulePermission usage in maintenance views")
            return True
        else:
            print("No fixes needed for HasModulePermission in maintenance views")
            return False
    
    print("HasModulePermission appears to be used correctly in maintenance views")
    return True

if __name__ == "__main__":
    print("Checking maintenance permission classes...")
    check_and_fix_maintenance_permissions()
    print("Done!")
