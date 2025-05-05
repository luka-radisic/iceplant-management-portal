#!/usr/bin/env python
"""
Script to fix the inventory module permissions mapping directly in the file.
"""
import os
import re

def fix_inventory_permissions_in_file():
    """
    Fix the inventory permission mapping directly in group_permissions.py
    """
    # Path to the group_permissions.py file
    filepath = '/app/iceplant_portal/iceplant_core/group_permissions.py'
    
    # Check if the file exists
    if not os.path.exists(filepath):
        print(f"Error: File {filepath} not found")
        return False
        
    # Read the file content
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Define the pattern to find the inventory permissions in MODULE_PERMISSION_MAPPING
    pattern = r"('inventory':|'inventory': )\s*\[\s*('inventory\.view_inventoryitem',|'inventory.view_inventoryitem',)\s*('inventory\.add_inventoryitem',|'inventory.add_inventoryitem',)\s*('inventory\.change_inventoryitem',|'inventory.change_inventoryitem',)\s*('inventory\.delete_inventoryitem',|'inventory.delete_inventoryitem',).*?\]"
    
    # Define the replacement with correct inventory permission names
    replacement = """'inventory': [
        'inventory.view_inventory',
        'inventory.add_inventory',
        'inventory.change_inventory',
        'inventory.delete_inventory',
        'inventory.view_inventoryadjustment',
        'inventory.add_inventoryadjustment',
        'inventory.change_inventoryadjustment',
        'inventory.delete_inventoryadjustment',
    ]"""
    
    # Use regex to replace the inventory permissions
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # If no changes were made, try a more aggressive approach
    if new_content == content:
        print("No changes made with regex - trying a more direct approach")
        
        # Look for the MODULE_PERMISSION_MAPPING definition
        mapping_start = content.find('MODULE_PERMISSION_MAPPING = {')
        if mapping_start == -1:
            print("Could not find MODULE_PERMISSION_MAPPING in the file")
            return False
        
        # Find where the inventory section begins
        inventory_start = content.find("'inventory':", mapping_start)
        if inventory_start == -1:
            print("Could not find inventory section in MODULE_PERMISSION_MAPPING")
            return False
            
        # Find the end of the inventory section (the next module or the end of the dictionary)
        next_module = re.search(r"'[^']*':\s*\[", content[inventory_start + 12:])
        if next_module:
            inventory_end = inventory_start + 12 + next_module.start() - 1
        else:
            # Look for the end of the dictionary
            inventory_end = content.find('}', inventory_start)
            if inventory_end == -1:
                print("Could not find the end of the inventory section")
                return False
        
        # Replace the inventory section
        new_content = content[:inventory_start] + replacement + content[inventory_end:]
    
    # Write the modified content back to the file
    with open(filepath, 'w') as f:
        f.write(new_content)
    
    print(f"Updated inventory permissions in {filepath}")
    return True

if __name__ == "__main__":
    print("Fixing inventory permissions directly in group_permissions.py...")
    if fix_inventory_permissions_in_file():
        print("Successfully updated inventory permissions")
        
        # Also restart Django to apply changes
        print("Changes applied - please restart the Django server")
    else:
        print("Failed to update inventory permissions")
