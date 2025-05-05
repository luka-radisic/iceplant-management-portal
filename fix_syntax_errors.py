"""
Fix syntax errors in Python files related to permission classes.

This script:
1. Identifies Python files with potential syntax errors
2. Fixes the 'unexpected character after line continuation character' error
3. Creates backups of original files
4. Reports all changes made
"""
import os
import re
import glob
import shutil
from datetime import datetime

def create_backup(file_path):
    """Create a backup of a file with timestamp"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.bak_{timestamp}"
    shutil.copy2(file_path, backup_path)
    print(f"Created backup at {backup_path}")
    return backup_path

def fix_syntax_errors(file_path):
    """Fix common syntax errors related to permission classes"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Store original content for change detection
    original_content = content
    
    # Fix 1: Replace escaped quotes in strings (common syntax error)
    content = re.sub(r"\\['\"](.*?)\\['\"]", r"'\1'", content)
    
    # Fix 2: Fix class IsAdmin definition format issues
    content = re.sub(
        r"# Define custom permission class for ([^\n]+)\nclass Is\1\(IsInGroups\):\n\s+def __init__\(self\):\n\s+super\(\).__init__\(groups=\[\\?['\"]([^'\"]+)\\?['\"]\]\)",
        r"# Define custom permission class for \1\nclass Is\1(IsInGroups):\n    def __init__(self):\n        super().__init__(groups=['\2'])",
        content
    )
    
    # Fix 3: Fix malformed multi-line strings
    content = re.sub(r"\\\\n", r"\\n", content)
    
    # Check if content was changed
    if content != original_content:
        create_backup(file_path)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed syntax errors in {file_path}")
        return True
    else:
        print(f"No syntax issues found in {file_path}")
        return False

def fix_api_views_files():
    """Specifically fix the known issues in api_views.py files"""
    potential_files = [
        '/app/iceplant_portal/users/api_views.py',
        '/app/iceplant_portal/users/api_views_groups.py'
    ]
    
    for file_path in potential_files:
        if os.path.exists(file_path):
            fix_syntax_errors(file_path)

def scan_for_syntax_issues():
    """Scan Python files for potential syntax issues"""
    files_with_issues = []
    
    # Look for files with IsInGroups or HasModulePermission
    for root, dirs, files in os.walk('/app/iceplant_portal'):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if 'IsInGroups' in content or 'HasModulePermission' in content:
                            if fix_syntax_errors(file_path):
                                files_with_issues.append(file_path)
                except UnicodeDecodeError:
                    print(f"Warning: Could not read {file_path} as UTF-8")
    
    return files_with_issues

if __name__ == "__main__":
    print("Fixing API views files...")
    fix_api_views_files()
    
    print("\nScanning for other syntax issues...")
    problem_files = scan_for_syntax_issues()
    
    if problem_files:
        print(f"\nFixed syntax errors in {len(problem_files)} files:")
        for file in problem_files:
            print(f"  - {file}")
    else:
        print("\nNo additional files with syntax issues found.")
    
    print("\nDone! Please restart the backend server for changes to take effect.")
