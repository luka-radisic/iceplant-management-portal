"""
Script to fix the HasModulePermission backend error.
"""

import os
import django
from django.conf import settings

# Initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iceplant_portal.settings')
django.setup()

def fix_has_module_permission_class():
    """
    Fix the HasModulePermission class to make it callable as a permission class.
    The error is typically caused by using HasModulePermission directly instead of HasModulePermission()
    """
    # Find the files that use HasModulePermission
    maintenance_app_dir = os.path.join(settings.BASE_DIR, 'maintenance')
    
    # Look for ViewSet implementations
    for root, dirs, files in os.walk(maintenance_app_dir):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()
                    
                # Check if this file uses HasModulePermission incorrectly
                if 'HasModulePermission' in content and 'permission_classes' in content:
                    print(f"Checking file: {filepath}")
                    
                    # This is a simple fix that adds parentheses to HasModulePermission if missing
                    fixed_content = content.replace(
                        'permission_classes = [HasModulePermission]',
                        'permission_classes = [HasModulePermission()]'
                    )
                    fixed_content = fixed_content.replace(
                        'permission_classes = [IsAuthenticated, HasModulePermission]',
                        'permission_classes = [IsAuthenticated, HasModulePermission()]'
                    )
                    fixed_content = fixed_content.replace(
                        'permission_classes = [HasModulePermission, IsAuthenticated]',
                        'permission_classes = [HasModulePermission(), IsAuthenticated]'
                    )
                    
                    if fixed_content != content:
                        with open(filepath, 'w') as f:
                            f.write(fixed_content)
                        print(f"Fixed HasModulePermission in {filepath}")
                    else:
                        print(f"No fixes needed in {filepath}")
    
    print("Finished checking and fixing HasModulePermission usage.")

if __name__ == "__main__":
    fix_has_module_permission_class()
    print("Script completed. Please restart your backend server for changes to take effect.")
