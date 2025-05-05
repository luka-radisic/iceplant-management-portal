"""
Comprehensive script to check and fix permission class usage across the entire project.

This script:
1. Checks for incorrect usage of permission classes that require instantiation
2. Creates custom classes for common permission patterns
3. Updates views to use the correct permission class syntax
"""

import os
import sys
import re
import shutil
from datetime import datetime

def create_backup(file_path):
    """Create a backup of a file with timestamp"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.bak_{timestamp}"
    shutil.copy2(file_path, backup_path)
    print(f"Created backup at {backup_path}")
    return backup_path

def check_and_fix_file(file_path, patterns_to_fix):
    """
    Check a file for incorrect permission class usage and fix it
    
    Args:
        file_path: Path to the file to check and fix
        patterns_to_fix: Dictionary of regex patterns and their replacements
    
    Returns:
        bool: True if changes were made, False otherwise
    """
    if not os.path.exists(file_path):
        print(f"Warning: File not found: {file_path}")
        return False
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Apply each pattern and replacement
    for pattern, replacement in patterns_to_fix.items():
        content = re.sub(pattern, replacement, content)
    
    # If content changed, write the file and return True
    if content != original_content:
        create_backup(file_path)
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Fixed permission classes in {file_path}")
        return True
    
    return False

def scan_directory(directory, patterns_to_fix):
    """
    Recursively scan a directory for Python files and fix permission classes
    
    Args:
        directory: Directory to scan
        patterns_to_fix: Dictionary of regex patterns and their replacements
    
    Returns:
        tuple: (files_checked, files_fixed)
    """
    files_checked = 0
    files_fixed = 0
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                files_checked += 1
                
                with open(file_path, 'r') as f:
                    content = f.read()
                
                # Only check files that import permission classes
                if ('from rest_framework.permissions import' in content and 
                    'permission_classes' in content):
                    if check_and_fix_file(file_path, patterns_to_fix):
                        files_fixed += 1
    
    return files_checked, files_fixed

def main():
    """Main entry point for the script"""
    # Define patterns to look for and their replacements
    patterns_to_fix = {
        # Fix IsInGroups usage with arguments
        r'permission_classes\s*=\s*\[\s*IsAuthenticated\s*,\s*IsInGroups\(\s*\[\s*[\'"]([^\'"]+)[\'"]\s*\]\s*\)\s*\]': 
            r'# Define custom permission class for \1\nclass Is\1(IsInGroups):\n    def __init__(self):\n        super().__init__(groups=[\'\1\'])\n\n# Use the custom class\npermission_classes = [IsAuthenticated, Is\1]',
        
        # Fix HasModulePermission usage without arguments
        r'permission_classes\s*=\s*\[\s*IsAuthenticated\s*,\s*HasModulePermission\s*\]': 
            r'permission_classes = [IsAuthenticated, HasModulePermission(\'default_module\')]',
    }
    
    # Directory to scan (app directory)
    app_dir = '/app/iceplant_portal'
    
    print(f"Scanning {app_dir} for incorrect permission class usage...")
    files_checked, files_fixed = scan_directory(app_dir, patterns_to_fix)
    
    print(f"Scan complete. Checked {files_checked} Python files, fixed {files_fixed} files.")
    
    if files_fixed > 0:
        print("Please restart the application server for changes to take effect.")
    else:
        print("No issues found that required fixing.")

if __name__ == "__main__":
    main()
