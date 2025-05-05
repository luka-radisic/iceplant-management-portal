"""
Script to fix the maintenance module permissions by creating a dedicated permission class
"""

import os
import sys
import re
import shutil

def fix_maintenance_permissions():
    """
    Fix the maintenance permissions by creating a dedicated HasMaintenanceModulePermission class
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
    
    # Add the custom permission class for maintenance module
    if 'class HasMaintenanceModulePermission' not in content:
        # Insert the custom permission class after the imports
        permission_class_def = """
# Define a custom permission class for Maintenance module access
class HasMaintenanceModulePermission(HasModulePermission):
    def __init__(self):
        super().__init__(module='maintenance')
"""
        # Find the position after imports but before the first class definition
        import_section_end = content.find('class StandardResultsSetPagination')
        if import_section_end > 0:
            # Insert the new class definition
            content = content[:import_section_end] + permission_class_def + content[import_section_end:]
            
            # Replace the HasModulePermission usage with the new class
            content = content.replace(
                "permission_classes = [IsAuthenticated, HasModulePermission('maintenance')]",
                "permission_classes = [IsAuthenticated, HasMaintenanceModulePermission]"
            )
            
            # Write the updated content back to the file
            with open(views_path, 'w') as file:
                file.write(content)
            
            print("Fixed maintenance permissions with a dedicated HasMaintenanceModulePermission class")
            return True
    else:
        print("HasMaintenanceModulePermission class already exists")
    
    return False

if __name__ == "__main__":
    print("Fixing maintenance module permissions...")
    fix_maintenance_permissions()
    print("Done!")
