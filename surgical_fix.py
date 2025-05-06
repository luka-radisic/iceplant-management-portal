#!/usr/bin/env python
"""
Final surgical fix for module permissions removal issue.
Directly targets the update_group_module_permissions function.
"""

import os
import sys
import re
import shutil

def surgical_fix():
    """Apply a very specific surgical fix to the file"""
    # Path to the API views file
    api_views_path = '/app/iceplant_portal/users/api_views_groups.py'
    
    # Make sure the file exists
    if not os.path.exists(api_views_path):
        print(f"Error: File not found: {api_views_path}")
        return False
    
    # Create a backup
    backup_path = api_views_path + '.surgical.bak'
    try:
        shutil.copy2(api_views_path, backup_path)
        print(f"Created backup at {backup_path}")
    except Exception as e:
        print(f"Error creating backup: {e}")
        return False
    
    # Read the file content
    try:
        with open(api_views_path, 'r') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return False
    
    # We need to find the specific line with remove_module_permissions_from_group
    # and remove it if it comes after the direct permission removal code
    target_pattern = r"(\s+?)remove_module_permissions_from_group\(module, group_name\)"
    
    # Let's find all occurrences
    all_matches = list(re.finditer(target_pattern, content))
    
    if not all_matches:
        print("Could not find any instances of the target function call")
        return False
    
    print(f"Found {len(all_matches)} instances of the function call")
    
    # We specifically want to target the instance around line 306
    for match in all_matches:
        # Get some context (20 lines before)
        context_start = max(0, match.start() - 500)
        context = content[context_start:match.start()]
        
        # If this instance has the "Explicitly removed" text nearby, it's our target
        if "Explicitly removed" in context:
            target_match = match
            print(f"Found the target instance after permission removal code")
            break
    else:
        print("Could not find the target instance after permission removal code")
        return False
    
    # Now surgically remove just this line
    modified_content = (
        content[:target_match.start()] + 
        "                # Removed redundant call to remove_module_permissions_from_group" + 
        content[target_match.end():]
    )
    
    # Write the updated content
    try:
        with open(api_views_path, 'w') as f:
            f.write(modified_content)
        print("Successfully applied the surgical fix")
    except Exception as e:
        print(f"Error writing file: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Applying surgical fix for module permissions removal...")
    if surgical_fix():
        print("Fix applied successfully!")
    else:
        print("Failed to apply fix")
