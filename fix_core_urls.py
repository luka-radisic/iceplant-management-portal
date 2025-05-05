"""
Quick fix script for iceplant_core urls.py issue
"""

import os
import sys
import re
from datetime import datetime

def backup_file(file_path):
    """Create a backup of the file with timestamp"""
    from shutil import copyfile
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.bak-{timestamp}"
    try:
        copyfile(file_path, backup_path)
        print(f"Created backup at {backup_path}")
    except Exception as e:
        print(f"Warning: Could not create backup: {str(e)}")

def fix_urls_file(file_path):
    """Fix common URL pattern issues"""
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found")
        return False
        
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            
        # Create backup before making changes
        backup_file(file_path)
        
        # Fix common URL pattern issues
        
        # 1. Fix missing commas between URL patterns
        fixed_content = re.sub(
            r'(path\([^)]+\))\s*\n\s+(path\()',
            r'\1,\n    \2',
            content
        )
        
        # 2. Fix URL include syntax
        fixed_content = re.sub(
            r'include\(([\'"])(.+?)([\'"])\)',
            lambda m: f"include({m.group(1)}{m.group(2)}{m.group(3)})",
            fixed_content
        )
        
        # 3. Fix line continuations
        fixed_content = re.sub(
            r'\\(\s*\n)',
            r'\1',
            fixed_content
        )
        
        # 4. Fix app_name declaration if needed
        if 'app_name' in fixed_content:
            fixed_content = re.sub(
                r'app_name\s*=\s*[\'"](.+?)[\'"]',
                lambda m: f'app_name = "{m.group(1)}"',
                fixed_content
            )
            
        # Write the fixed content back
        with open(file_path, 'w') as f:
            f.write(fixed_content)
            
        print(f"Fixed URL patterns in {file_path}")
        return True
        
    except Exception as e:
        print(f"Error fixing {file_path}: {str(e)}")
        return False

def fix_api_urls():
    """Fix the iceplant_core API URLs files"""
    core_urls_path = '/app/iceplant_portal/iceplant_core/urls.py'
    api_urls_path = '/app/iceplant_portal/iceplant_core/api/urls.py'
    user_urls_path = '/app/iceplant_portal/users/urls.py'
    
    # Start with the core URLs
    if fix_urls_file(core_urls_path):
        print("Fixed core URLs file")
    
    # Then fix the API URLs
    if os.path.exists(api_urls_path) and fix_urls_file(api_urls_path):
        print("Fixed API URLs file")
    
    # Finally fix the users URLs
    if os.path.exists(user_urls_path) and fix_urls_file(user_urls_path):
        print("Fixed users URLs file")
    
    print("\nURL fixes complete. Please restart the Django server.")

if __name__ == "__main__":
    print("Starting URL patterns fix...")
    fix_api_urls()
