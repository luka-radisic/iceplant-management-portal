"""
Script to finalize and commit the module permissions system implementation
"""
import os
import sys
import subprocess
import logging
from datetime import datetime

# Configure logging
log_filename = f"module_permissions_commit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_filename)
    ]
)
logger = logging.getLogger(__name__)

def run_command(command, cwd=None):
    """Run a shell command and return the output"""
    try:
        result = subprocess.run(command, shell=True, check=True, 
                             capture_output=True, text=True, cwd=cwd)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        logger.error(f"Command failed: {e}")
        logger.error(f"Error output: {e.stderr}")
        return None

def commit_changes():
    """Commit the changes to the repository"""
    try:
        # Check if we're on branch V7
        branch = run_command("git branch --show-current")
        if branch != "V7":
            logger.warning(f"Not on branch V7, currently on: {branch}")
            choice = input(f"You are on branch {branch}, not V7. Continue? (y/n): ")
            if choice.lower() != 'y':
                logger.info("Commit aborted")
                return False
        
        # Get file status
        status = run_command("git status --porcelain")
        if not status:
            logger.info("No changes to commit")
            return False
        
        logger.info(f"Files to commit:\n{status}")
        
        # Commit files
        new_files = [
            "iceplant_portal/iceplant_core/module_permissions_system.py",
            "iceplant_portal/iceplant_core/apps.py",
            "iceplant_portal/iceplant_core/management/commands/sync_module_permissions.py",
            "integrate_module_permissions.py",
            "MODULE_PERMISSIONS_SYSTEM_GUIDE.md",
            "test_module_permissions.py"
        ]
        
        modified_files = [
            "iceplant_portal/users/api_views_groups.py"
        ]
        
        # Add the new files
        for file in new_files:
            if os.path.exists(file):
                run_command(f"git add {file}")
                logger.info(f"Added new file: {file}")
        
        # Add the modified files
        for file in modified_files:
            if os.path.exists(file):
                run_command(f"git add {file}")
                logger.info(f"Added modified file: {file}")
        
        # Add any remaining changed files
        choice = input("Add all other changed files? (y/n): ")
        if choice.lower() == 'y':
            run_command("git add .")
            logger.info("Added all changed files")
        
        # Commit
        commit_message = """
Fix module permissions system to connect frontend & backend permissions

This commit implements a comprehensive module permissions system that:

1. Creates proper Django permissions for all modules
2. Links the custom HasModulePermission system with Django's permission system
3. Ensures module permissions are visible in the Django admin interface
4. Improves permission persistence across server restarts

Key changes:
- Created module_permissions_system.py with comprehensive functions
- Updated api_views_groups.py to use the new system
- Created a Django management command for syncing permissions
- Added auto-initialization in the app config
- Added integration and testing scripts
- Created documentation in MODULE_PERMISSIONS_SYSTEM_GUIDE.md

This fixes the issue with HR Payrol group (and other groups) not showing 
their module permissions in the Django admin interface, while maintaining
compatibility with the existing frontend implementation.
"""
        result = run_command(f'git commit -m "{commit_message}"')
        if result:
            logger.info(f"Committed changes: {result}")
            return True
        else:
            logger.error("Failed to commit changes")
            return False
    except Exception as e:
        logger.error(f"Error during commit: {e}")
        return False

def confirm_changes():
    """Print a summary of the changes made"""
    print("\n==== Module Permissions System Implementation ====\n")
    
    print("New Files Created:")
    print("1. iceplant_portal/iceplant_core/module_permissions_system.py")
    print("   - Core implementation connecting frontend & backend permissions")
    print("   - Functions for creating, syncing, and managing module permissions")
    
    print("2. iceplant_portal/iceplant_core/apps.py")
    print("   - Auto-initializes the permissions system on startup")
    
    print("3. iceplant_portal/iceplant_core/management/commands/sync_module_permissions.py")
    print("   - Django management command for manual permission sync")
    
    print("4. integrate_module_permissions.py")
    print("   - Script to integrate the system with your codebase")
    
    print("5. MODULE_PERMISSIONS_SYSTEM_GUIDE.md")
    print("   - Documentation on the implementation and how to use it")
    
    print("6. test_module_permissions.py")
    print("   - Test script to verify the implementation works")
    
    print("\nModified Files:")
    print("1. iceplant_portal/users/api_views_groups.py")
    print("   - Updated to use the new module_permissions_system")
    
    print("\nNext Steps:")
    print("1. Run the integration script:")
    print("   python manage.py shell < integrate_module_permissions.py")
    
    print("2. Make sure 'iceplant_core' is in INSTALLED_APPS in settings.py")
    
    print("3. Restart the Django server")
    
    print("4. Verify permissions in the Django admin interface")
    
    print("\nWould you like to commit these changes to the V7 branch?")
    choice = input("Commit changes? (y/n): ")
    return choice.lower() == 'y'

if __name__ == "__main__":
    if confirm_changes():
        if commit_changes():
            print("\nChanges successfully committed to the repository!")
            print("You can now push the changes to the remote repository.")
        else:
            print("\nFailed to commit changes. See log for details.")
    else:
        print("\nCommit cancelled. Changes remain in the working directory.")
