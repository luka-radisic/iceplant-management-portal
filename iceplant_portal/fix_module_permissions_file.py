"""
Script to fix module_permissions.py file
"""

import os
import sys
import django

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

import re

def fix_module_permissions_file():
    """Fix the module_permissions.py file to use correct inventory permissions"""
    
    file_path = "/app/iceplant_portal/iceplant_core/module_permissions.py"
    
    # Backup the file
    with open(file_path, 'r') as f:
        original_content = f.read()
    
    with open(f"{file_path}.bak", 'w') as f:
        f.write(original_content)
    
    print(f"Created backup at {file_path}.bak")
    
    # Replace the incorrect inventory permissions with the correct ones
    fixed_content = re.sub(
        r"'inventory': \[\s*\('inventory', 'view_inventoryitem'\),\s*\('inventory', 'add_inventoryitem'\),\s*\('inventory', 'change_inventoryitem'\),\s*\('inventory', 'delete_inventoryitem'\),\s*\],",
        """'inventory': [
        ('inventory', 'view_inventory'),
        ('inventory', 'add_inventory'),
        ('inventory', 'change_inventory'),
        ('inventory', 'delete_inventory'),
        ('inventory', 'view_inventoryadjustment'),
        ('inventory', 'add_inventoryadjustment'),
        ('inventory', 'change_inventoryadjustment'),
        ('inventory', 'delete_inventoryadjustment'),
    ],""",
        original_content
    )
    
    if fixed_content != original_content:
        with open(file_path, 'w') as f:
            f.write(fixed_content)
        print("Fixed inventory permissions in module_permissions.py")
        return True
    else:
        print("No changes needed to module_permissions.py")
        return False

if __name__ == "__main__":
    print("Fixing module_permissions.py file...")
    fix_module_permissions_file()
    print("Done!")
