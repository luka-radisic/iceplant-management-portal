"""
Script to diagnose why HR Payrol group doesn't show permissions in Django admin
"""
import os
import sys
import json
import logging
from datetime import datetime

# Set up logging
log_filename = f"hr_payrol_diagnosis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_filename)
    ]
)
logger = logging.getLogger(__name__)

def setup_django():
    """Set up Django environment"""
    try:
        # Add the iceplant_portal directory to the path
        current_dir = os.getcwd()
        portal_dir = os.path.join(current_dir, 'iceplant_portal')
        if os.path.exists(portal_dir):
            sys.path.append(portal_dir)
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iceplant_portal.settings')
            import django
            django.setup()
            logger.info(f"Django {django.get_version()} environment set up")
            return True
        else:
            logger.error(f"Could not find iceplant_portal directory in {current_dir}")
            return False
    except Exception as e:
        logger.error(f"Error setting up Django: {e}")
        return False

def check_django_auth_system():
    """Check the Django authentication system configuration"""
    try:
        from django.conf import settings
        
        # Check auth apps
        auth_apps = [app for app in settings.INSTALLED_APPS if 'auth' in app.lower()]
        logger.info(f"Authentication apps: {auth_apps}")
        
        # Check authentication backends
        logger.info(f"Authentication backends: {settings.AUTHENTICATION_BACKENDS}")
        
        return True
    except Exception as e:
        logger.error(f"Error checking auth config: {e}")
        return False

def check_group_and_permissions():
    """Check groups and permissions configuration"""
    try:
        from django.contrib.auth.models import Group, Permission
        from django.contrib.contenttypes.models import ContentType
        
        # Check if HR Payrol group exists
        logger.info("Looking for HR Payrol group...")
        hr_payrol = Group.objects.filter(name="HR Payrol").first()
        
        if hr_payrol:
            logger.info(f"Found HR Payrol group with ID: {hr_payrol.id}")
            
            # Check what permissions are assigned to HR Payrol
            permissions = hr_payrol.permissions.all()
            logger.info(f"HR Payrol has {permissions.count()} assigned Django permissions")
            
            for perm in permissions:
                logger.info(f"  - {perm.content_type.app_label}.{perm.codename}: {perm.name}")
                
            # Check users in the group
            users = hr_payrol.user_set.all()
            logger.info(f"HR Payrol has {users.count()} users")
            for user in users:
                logger.info(f"  - {user.username}")
        else:
            logger.warning("HR Payrol group NOT found in database!")
            
        # Check all groups in the system
        groups = Group.objects.all()
        logger.info(f"Total groups in system: {groups.count()}")
        for group in groups:
            perms_count = group.permissions.count()
            logger.info(f"  - {group.name}: {perms_count} Django permissions, {group.user_set.count()} users")
        
        # Check module permissions for comparison
        from iceplant_core.group_permissions import HasModulePermission
        
        # Check which modules HR Payrol has access to
        hr_payrol_modules = []
        for module, groups in HasModulePermission.MODULE_GROUP_MAPPING.items():
            if "HR Payrol" in groups:
                hr_payrol_modules.append(module)
        
        if hr_payrol_modules:
            logger.info(f"HR Payrol has access to modules: {hr_payrol_modules}")
        else:
            logger.warning("HR Payrol not found in any modules in MODULE_GROUP_MAPPING")
            
        # List all content types and permissions
        content_types = ContentType.objects.all()
        logger.info(f"Total content types: {content_types.count()}")
        
        module_related_types = []
        for ct in content_types:
            if any(module in ct.app_label.lower() for module in ['attendance', 'expenses', 'inventory', 'sales', 'maintenance', 'buyers']):
                module_related_types.append(ct)
                
        logger.info(f"Module-related content types: {len(module_related_types)}")
        for ct in module_related_types[:20]:  # Limit to 20 for brevity
            logger.info(f"  - {ct.app_label}.{ct.model}")
            
        return True
    except Exception as e:
        logger.error(f"Error checking groups and permissions: {e}")
        return False

def check_module_permission_creation():
    """Check if Django permissions are created for module access"""
    try:
        from django.contrib.auth.models import Permission
        from django.contrib.contenttypes.models import ContentType
        
        # Check if there are any permissions related to module access
        module_permissions = Permission.objects.filter(codename__contains='module')
        
        logger.info(f"Found {module_permissions.count()} permissions with 'module' in codename")
        for perm in module_permissions:
            logger.info(f"  - {perm.content_type.app_label}.{perm.codename}: {perm.name}")
            
        # Check attendance module permissions specifically
        attendance_ct = ContentType.objects.filter(app_label='attendance').first()
        if attendance_ct:
            att_perms = Permission.objects.filter(content_type=attendance_ct)
            logger.info(f"Attendance content type has {att_perms.count()} permissions")
            for perm in att_perms:
                logger.info(f"  - {perm.codename}: {perm.name}")
        else:
            logger.warning("No attendance content type found")
        
        # Check expense module permissions
        expense_ct = ContentType.objects.filter(app_label='expenses').first()
        if expense_ct:
            exp_perms = Permission.objects.filter(content_type=expense_ct)
            logger.info(f"Expenses content type has {exp_perms.count()} permissions")
            for perm in exp_perms:
                logger.info(f"  - {perm.codename}: {perm.name}")
        else:
            logger.warning("No expenses content type found")
            
        return True
    except Exception as e:
        logger.error(f"Error checking module permission creation: {e}")
        return False

def check_custom_admin_views():
    """Check for custom admin views that might handle module permissions"""
    try:
        # Check if there are admin.py files in relevant modules
        admin_files = [
            os.path.join('iceplant_portal', 'users', 'admin.py'),
            os.path.join('iceplant_portal', 'iceplant_core', 'admin.py')
        ]
        
        for file_path in admin_files:
            if os.path.exists(file_path):
                logger.info(f"Found admin file: {file_path}")
                with open(file_path, 'r') as f:
                    content = f.read()
                
                # Check for Group registration
                if 'Group' in content and 'register' in content:
                    logger.info(f"File {file_path} seems to register Group model with admin")
            else:
                logger.info(f"Admin file not found: {file_path}")
        
        return True
    except Exception as e:
        logger.error(f"Error checking custom admin views: {e}")
        return False

def create_django_permissions_for_modules():
    """
    Attempt to create Django permissions for module access
    This is a potential fix for the HR Payrol issue
    """
    try:
        from django.contrib.auth.models import Group, Permission
        from django.contrib.contenttypes.models import ContentType
        from django.db import transaction
        
        logger.info("Attempting to create Django permissions for module access...")
        
        # Get or create a content type for module permissions
        ct, created = ContentType.objects.get_or_create(
            app_label='iceplant_core',
            model='modulepermission'
        )
        if created:
            logger.info(f"Created new content type: {ct}")
        else:
            logger.info(f"Using existing content type: {ct}")
        
        # Create permissions for each module
        modules = ['attendance', 'sales', 'inventory', 'expenses', 'maintenance', 'buyers']
        created_perms = []
        
        for module in modules:
            codename = f"access_{module}_module"
            name = f"Can access {module} module"
            
            perm, created = Permission.objects.get_or_create(
                content_type=ct,
                codename=codename,
                defaults={'name': name}
            )
            
            if created:
                logger.info(f"Created permission: {perm.codename}")
            else:
                logger.info(f"Permission already exists: {perm.codename}")
                
            created_perms.append(perm)
        
        # Now, assign the appropriate permissions to HR Payrol
        hr_payrol = Group.objects.filter(name="HR Payrol").first()
        if hr_payrol:
            # Get permissions for attendance and expenses
            attendance_perm = Permission.objects.get(codename="access_attendance_module")
            expenses_perm = Permission.objects.get(codename="access_expenses_module")
            
            # Assign permissions
            with transaction.atomic():
                hr_payrol.permissions.add(attendance_perm)
                hr_payrol.permissions.add(expenses_perm)
                
            logger.info(f"Assigned module permissions to HR Payrol: attendance, expenses")
            
            # Verify permissions were added
            hr_perms = hr_payrol.permissions.all()
            logger.info(f"HR Payrol now has {hr_perms.count()} permissions")
            for perm in hr_perms:
                logger.info(f"  - {perm.codename}: {perm.name}")
        else:
            logger.warning("HR Payrol group not found, cannot assign permissions")
        
        # Update the module permissions mapping to reflect the Django permissions
        from iceplant_core.group_permissions import HasModulePermission
        
        # Create backup of current mapping
        mapping_backup = HasModulePermission.MODULE_GROUP_MAPPING.copy()
        logger.info("Created backup of current module mapping")
        
        # Ensure HR Payrol is in the correct modules
        if 'attendance' in HasModulePermission.MODULE_GROUP_MAPPING and "HR Payrol" not in HasModulePermission.MODULE_GROUP_MAPPING['attendance']:
            HasModulePermission.MODULE_GROUP_MAPPING['attendance'].append("HR Payrol")
            logger.info("Added HR Payrol to attendance module mapping")
            
        if 'expenses' in HasModulePermission.MODULE_GROUP_MAPPING and "HR Payrol" not in HasModulePermission.MODULE_GROUP_MAPPING['expenses']:
            HasModulePermission.MODULE_GROUP_MAPPING['expenses'].append("HR Payrol")
            logger.info("Added HR Payrol to expenses module mapping")
            
        # Save updated mapping
        try:
            from iceplant_core.module_permissions_utils import save_module_permissions
            result = save_module_permissions()
            logger.info(f"Saved updated module permissions: {result}")
        except Exception as e:
            logger.error(f"Error saving module permissions: {e}")
            # Restore backup
            HasModulePermission.MODULE_GROUP_MAPPING = mapping_backup
            logger.info("Restored module mapping backup")
        
        return True
    except Exception as e:
        logger.error(f"Error creating Django permissions for modules: {e}")
        return False

def main():
    """Main function to coordinate diagnosis"""
    logger.info("Starting HR Payrol permission diagnosis...")
    
    # Set up Django
    if not setup_django():
        logger.error("Failed to set up Django environment, exiting.")
        return
    
    # Check Django auth system
    logger.info("\n=== Checking Django authentication system ===")
    check_django_auth_system()
    
    # Check groups and permissions
    logger.info("\n=== Checking groups and permissions ===")
    check_group_and_permissions()
    
    # Check for module permission creation
    logger.info("\n=== Checking module permission creation ===")
    check_module_permission_creation()
    
    # Check custom admin views
    logger.info("\n=== Checking custom admin views ===")
    check_custom_admin_views()
    
    # Ask if user wants to create Django permissions
    create_perms = input("\nDo you want to create Django permissions for modules? (y/n): ").lower() == 'y'
    
    if create_perms:
        logger.info("\n=== Creating Django permissions for modules ===")
        create_django_permissions_for_modules()
    
    logger.info(f"\nDiagnosis complete. Log saved to {log_filename}")

if __name__ == "__main__":
    main()
