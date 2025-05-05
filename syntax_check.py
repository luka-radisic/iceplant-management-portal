"""
Script to check for syntax errors in all Python files in the project
"""
import os
import sys
import subprocess

def check_file_syntax(filepath):
    """Check if a Python file has syntax errors"""
    result = subprocess.run(
        [sys.executable, '-m', 'py_compile', filepath],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"Syntax error in {filepath}:")
        print(result.stderr)
        return False
    return True

def fix_backslash_errors(filepath):
    """Fix backslash errors in a Python file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace problematic line continuation characters
    if '\\' in content and not '\\\n' in content:
        fixed_content = content.replace('\\', '\\\\')
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print(f"Fixed potential line continuation issues in {filepath}")
        return True
    return False

def scan_directory(directory):
    """Scan a directory for Python files with syntax errors"""
    fixed_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                # First check for syntax errors
                if not check_file_syntax(filepath):
                    # If there are errors, try to fix them
                    if fix_backslash_errors(filepath):
                        fixed_files.append(filepath)
                        # Check again after fixing
                        check_file_syntax(filepath)
    
    return fixed_files

if __name__ == "__main__":
    project_dir = r"c:\Users\Lukar\Documents\CMA-PH\iceplant-management-portal\iceplant_portal"
    print(f"Checking for syntax errors in {project_dir}...")
    
    fixed_files = scan_directory(project_dir)
    
    if fixed_files:
        print(f"\nFixed {len(fixed_files)} files with potential line continuation issues.")
    else:
        print("\nNo files needed fixing for line continuation issues.")
