#!/usr/bin/env python3
"""
Simple script to fix module_permissions.py file without Django dependencies
"""

import re
import os

def fix_module_permissions_file():
    """Fix the module_permissions.py file to use correct inventory permissions"""
    
    file_path = "/app/iceplant_portal/iceplant_core/module_permissions.py"
    
    try:
        # Check if the file exists
        if not os.path.exists(file_path):
            print(f"Error: File {file_path} does not exist")
            return False
        
        # Read the file content
        with open(file_path, 'r') as f:
            original_content = f.read()
        
        # Create a backup
        with open(f"{file_path}.bak", 'w') as f:
            f.write(original_content)
        
        print(f"Created backup at {file_path}.bak")
        
        # Replace the incorrect inventory permissions with the correct ones
        inventory_pattern = r"'inventory': \[\s*\('inventory', 'view_inventoryitem'\),\s*\('inventory', 'add_inventoryitem'\),\s*\('inventory', 'change_inventoryitem'\),\s*\('inventory', 'delete_inventoryitem'\),\s*\],"
        inventory_replacement = """'inventory': [
        ('inventory', 'view_inventory'),
        ('inventory', 'add_inventory'),
        ('inventory', 'change_inventory'),
        ('inventory', 'delete_inventory'),
        ('inventory', 'view_inventoryadjustment'),
        ('inventory', 'add_inventoryadjustment'),
        ('inventory', 'change_inventoryadjustment'),
        ('inventory', 'delete_inventoryadjustment'),
    ],"""
        
        fixed_content = re.sub(inventory_pattern, inventory_replacement, original_content)
        
        # Check if any changes were made
        if fixed_content == original_content:
            print("No changes needed to module_permissions.py")
            return False
        
        # Write the fixed content back to the file
        with open(file_path, 'w') as f:
            f.write(fixed_content)
        
        print("Fixed inventory permissions in module_permissions.py")
        return True
    
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Fixing module_permissions.py file...")
    fix_module_permissions_file()
    print("Done!")
