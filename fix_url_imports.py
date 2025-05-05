"""
Script to fix URL imports and URL patterns syntax issues in Django files.
This script will examine and fix common problems in URL configurations.
"""

import os
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

def fix_url_imports_in_file(file_path):
    """
    Fix common URL import and pattern syntax issues in Django files
    
    Returns:
        bool: True if changes were made, False otherwise
    """
    if not os.path.exists(file_path):
        print(f"Warning: File not found: {file_path}")
        return False
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Fix 1: Common syntax error with multiline imports
    content = re.sub(
        r'from django\.urls import\s+(\w+),\s*\\\s*\n\s*(\w+)', 
        r'from django.urls import \1, \2', 
        content
    )
    
    # Fix 2: Fix path imports with incorrect includes
    content = re.sub(
        r'path\([\'"](.*?)[\'"]\s*,\s*include\([\'"](.*?)[\'"]\)\s*,?\s*\)',
        r"path('\1', include('\2'))",
        content
    )
    
    # Fix 3: Fix missing comma in urlpatterns list
    content = re.sub(
        r'(path\(.*?\))\s*\n\s*(path\()',
        r'\1,\n    \2',
        content
    )
    
    # Fix 4: Fix trailing comma in last urlpattern
    content = re.sub(
        r'(path\(.*?\)),\s*\n\s*\]',
        r'\1\n]',
        content
    )
    
    # Fix 5: Fix malformed permission classes in API views that might be referenced
    content = re.sub(
        r'permission_classes\s*=\s*\[\s*IsAuthenticated\s*,\s*IsInGroups\(\s*\[\s*[\'"]([^\'"]+)[\'"]\s*\]\s*\)\s*\]',
        r'permission_classes = [IsAuthenticated, IsAdmin]',
        content
    )
    
    # If content changed, write the file and return True
    if content != original_content:
        create_backup(file_path)
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Fixed URL patterns in {file_path}")
        return True
    
    return False

def scan_django_files(directory):
    """
    Recursively scan a directory for Django files and fix URL configurations
    """
    files_checked = 0
    files_fixed = 0
    
    url_files = []
    
    # First find all urls.py files
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file == 'urls.py' or file.endswith('_urls.py'):
                file_path = os.path.join(root, file)
                url_files.append(file_path)
    
    # Process the URL files first
    for file_path in url_files:
        files_checked += 1
        if fix_url_imports_in_file(file_path):
            files_fixed += 1
    
    # Then check views.py files that might have URL-related issues
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file == 'views.py' or file.endswith('_views.py'):
                file_path = os.path.join(root, file)
                files_checked += 1
                if fix_url_imports_in_file(file_path):
                    files_fixed += 1
    
    return files_checked, files_fixed

def main():
    """Main entry point for the script"""
    # Directory to scan (app directory)
    app_dir = '/app/iceplant_portal'
    
    print(f"Scanning {app_dir} for URL configuration issues...")
    files_checked, files_fixed = scan_django_files(app_dir)
    
    print(f"Scan complete. Checked {files_checked} files, fixed {files_fixed} files.")
    
    if files_fixed > 0:
        print("Please restart the application server for changes to take effect.")
    else:
        print("No issues found that required fixing.")

if __name__ == "__main__":
    main()
