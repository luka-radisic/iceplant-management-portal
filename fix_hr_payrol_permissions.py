"""
This script creates appropriate Django permissions for modules and assigns them to the HR Payrol group
"""
import os
import sys
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fix_hr_payrol_permissions():
    """
    The primary issue appears to be that the HR Payrol group has module permissions in the custom 
    HasModulePermission system but no corresponding Django permissions in the admin interface.
    
    Solution:
    1. Create custom Django permissions for each module
    2. Assign the appropriate permissions to HR Payrol
    3. Sync the HasModulePermission mappings with Django permissions
    
    This script doesn't require the Django environment to be set up - it creates SQL commands
    that can be executed in the Django shell or directly in the database.
    """
    # Check module permissions first
    logger.info("Step 1: Checking module permissions files")
    current_dir = os.getcwd()
    files_to_check = [
        os.path.join(current_dir, "module_permissions.json"),
        os.path.join(current_dir, "iceplant_portal", "module_permissions.json"),
        os.path.join(current_dir, "iceplant_portal", "iceplant_core", "module_permissions.json")
    ]
    
    hr_payrol_modules = set()
    
    for file_path in files_to_check:
        if os.path.exists(file_path):
            logger.info(f"Checking {file_path}")
            try:
                with open(file_path, 'r') as f:
                    permissions = json.load(f)
                
                # Check which modules HR Payrol has access to
                for module, groups in permissions.items():
                    if "HR Payrol" in groups:
                        hr_payrol_modules.add(module)
                        logger.info(f"HR Payrol has access to {module} in {file_path}")
            except Exception as e:
                logger.error(f"Error reading {file_path}: {e}")
    
    if not hr_payrol_modules:
        logger.warning("HR Payrol not found in any modules!")
    else:
        logger.info(f"HR Payrol should have access to modules: {hr_payrol_modules}")
    
    # Create SQL commands to fix permissions
    logger.info("\nStep 2: Creating SQL commands to fix permissions")
    
    sql_commands = []
    
    # 1. Find HR Payrol group ID
    sql_commands.append("""
-- Find HR Payrol group ID
SELECT id, name FROM auth_group WHERE name = 'HR Payrol';
""")
    
    # 2. Create a content type for module permissions if it doesn't exist
    sql_commands.append("""
-- Create content type for module permissions if it doesn't exist
INSERT INTO django_content_type (app_label, model)
SELECT 'iceplant_core', 'modulepermission'
WHERE NOT EXISTS (
    SELECT 1 FROM django_content_type 
    WHERE app_label = 'iceplant_core' AND model = 'modulepermission'
);

-- Get the content type ID
SELECT id FROM django_content_type WHERE app_label = 'iceplant_core' AND model = 'modulepermission';
""")
    
    # 3. Create permissions for each module
    modules = ['attendance', 'sales', 'inventory', 'expenses', 'maintenance', 'buyers']
    for module in modules:
        sql_commands.append(f"""
-- Create permission for {module} module
INSERT INTO auth_permission (name, content_type_id, codename)
SELECT 'Can access {module} module', 
       (SELECT id FROM django_content_type WHERE app_label = 'iceplant_core' AND model = 'modulepermission'), 
       'access_{module}_module'
WHERE NOT EXISTS (
    SELECT 1 FROM auth_permission 
    WHERE codename = 'access_{module}_module' AND 
          content_type_id = (SELECT id FROM django_content_type WHERE app_label = 'iceplant_core' AND model = 'modulepermission')
);

-- Get the permission ID
SELECT id FROM auth_permission 
WHERE codename = 'access_{module}_module' AND 
      content_type_id = (SELECT id FROM django_content_type WHERE app_label = 'iceplant_core' AND model = 'modulepermission');
""")
    
    # 4. Assign permissions for HR Payrol's allowed modules
    for module in hr_payrol_modules:
        sql_commands.append(f"""
-- Assign {module} permission to HR Payrol
INSERT INTO auth_group_permissions (group_id, permission_id)
SELECT 
    (SELECT id FROM auth_group WHERE name = 'HR Payrol'), 
    (SELECT id FROM auth_permission 
     WHERE codename = 'access_{module}_module' AND 
           content_type_id = (SELECT id FROM django_content_type WHERE app_label = 'iceplant_core' AND model = 'modulepermission'))
WHERE NOT EXISTS (
    SELECT 1 FROM auth_group_permissions 
    WHERE group_id = (SELECT id FROM auth_group WHERE name = 'HR Payrol') AND 
          permission_id = (SELECT id FROM auth_permission 
                          WHERE codename = 'access_{module}_module' AND 
                                content_type_id = (SELECT id FROM django_content_type WHERE app_label = 'iceplant_core' AND model = 'modulepermission'))
);
""")
    
    # 5. Check that permissions were added correctly
    sql_commands.append("""
-- Check HR Payrol permissions
SELECT p.codename, p.name
FROM auth_permission p
JOIN auth_group_permissions gp ON p.id = gp.permission_id
JOIN auth_group g ON gp.group_id = g.id
WHERE g.name = 'HR Payrol';
""")
    
    # Write SQL commands to a file
    sql_file_path = "fix_hr_payrol_permissions.sql"
    with open(sql_file_path, "w") as f:
        f.write("-- SQL commands to fix HR Payrol permissions\n")
        f.write("-- Generated by fix_hr_payrol_permissions.py\n\n")
        
        for cmd in sql_commands:
            f.write(cmd)
            f.write("\n")
    
    logger.info(f"SQL commands written to {sql_file_path}")
    
    # Create Python integration script
    logger.info("\nStep 3: Creating Python integration script")
    
    integration_script = f"""\"\"\"
Integration script to create Django permissions for modules and assign them to HR Payrol
This should be run in the Django shell: python manage.py shell < {os.path.basename(__file__)}
\"\"\"
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

# Log function
def log(msg):
    print(f"[{__file__}] {{msg}}")

log("Starting module permissions integration...")

# Get or create content type for module permissions
ct, created = ContentType.objects.get_or_create(
    app_label='iceplant_core',
    model='modulepermission'
)
log(f"ContentType: {{ct}}")

# Create permissions for each module
modules = ['attendance', 'sales', 'inventory', 'expenses', 'maintenance', 'buyers']
module_perms = {{}}

for module in modules:
    codename = f"access_{{module}}_module"
    name = f"Can access {{module}} module"
    
    perm, created = Permission.objects.get_or_create(
        content_type=ct,
        codename=codename,
        defaults={{'name': name}}
    )
    
    module_perms[module] = perm
    log(f"Permission for {{module}}: {{perm.codename}}")

# Get HR Payrol group
try:
    hr_payrol = Group.objects.get(name="HR Payrol")
    log(f"Found HR Payrol group: {{hr_payrol.id}}")
    
    # From module permissions files, HR Payrol should have access to these modules
    hr_modules = {hr_payrol_modules}
    
    # Assign permissions to HR Payrol
    with transaction.atomic():
        for module in hr_modules:
            if module in module_perms:
                hr_payrol.permissions.add(module_perms[module])
                log(f"Added {{module}} permission to HR Payrol")
    
    # Check permissions
    perms = hr_payrol.permissions.all()
    log(f"HR Payrol now has {{perms.count()}} permissions:")
    for perm in perms:
        log(f"  - {{perm.codename}}: {{perm.name}}")
    
except Group.DoesNotExist:
    log("ERROR: HR Payrol group does not exist!")

log("Module permissions integration complete!")

# Ensure module permissions are synced with HasModulePermission system
try:
    from iceplant_core.group_permissions import HasModulePermission
    from iceplant_core.module_permissions_utils import save_module_permissions
    
    # Update HasModulePermission
    for module in hr_modules:
        if module in HasModulePermission.MODULE_GROUP_MAPPING:
            if "HR Payrol" not in HasModulePermission.MODULE_GROUP_MAPPING[module]:
                HasModulePermission.MODULE_GROUP_MAPPING[module].append("HR Payrol")
                log(f"Added HR Payrol to {{module}} in MODULE_GROUP_MAPPING")
    
    # Save to all locations
    save_module_permissions()
    log("Updated module permissions saved")
except Exception as e:
    log(f"Error syncing with HasModulePermission: {{e}}")
"""
    
    # Write integration script
    integration_script_path = "integrate_hr_payrol_permissions.py"
    with open(integration_script_path, "w") as f:
        f.write(integration_script)
    
    logger.info(f"Integration script written to {integration_script_path}")
    
    # Create shell script to fix permissions
    shell_script = """#!/bin/bash
# Script to fix HR Payrol permissions
echo "Fixing HR Payrol permissions..."

# Run SQL commands if using direct DB access
# cat fix_hr_payrol_permissions.sql | python manage.py dbshell

# Run integration script (preferred method)
python manage.py shell < integrate_hr_payrol_permissions.py

echo "HR Payrol permissions fixed!"
"""
    
    shell_script_path = "fix_hr_payrol_permissions.sh"
    with open(shell_script_path, "w") as f:
        f.write(shell_script)
    
    logger.info(f"Shell script written to {shell_script_path}")
    
    # Create Windows batch file
    batch_script = """@echo off
echo Fixing HR Payrol permissions...

rem Run integration script
python manage.py shell < integrate_hr_payrol_permissions.py

echo HR Payrol permissions fixed!
pause
"""
    
    batch_script_path = "fix_hr_payrol_permissions.bat"
    with open(batch_script_path, "w") as f:
        f.write(batch_script)
    
    logger.info(f"Batch script written to {batch_script_path}")
    
    # Return instructions
    return f"""
Successfully created scripts to fix HR Payrol permissions!

The issue is that while the module permissions system (HasModulePermission) shows HR Payrol
has access to modules, there are no corresponding Django permissions in the admin interface.

To fix this issue:

For Linux/Mac:
1. Copy the files to your Django project root
2. Make the shell script executable: chmod +x fix_hr_payrol_permissions.sh
3. Run the script: ./fix_hr_payrol_permissions.sh

For Windows:
1. Copy the files to your Django project root
2. Run the batch file: fix_hr_payrol_permissions.bat

OR, if you prefer to run the Python script directly:
1. Copy integrate_hr_payrol_permissions.py to your Django project root
2. Run: python manage.py shell < integrate_hr_payrol_permissions.py

After running the fix, HR Payrol group will have Django permissions for:
{hr_payrol_modules}

These permissions will appear in the Django admin interface.
"""

if __name__ == "__main__":
    try:
        logger.info("Starting HR Payrol permission fix...")
        instructions = fix_hr_payrol_permissions()
        logger.info("Fix scripts created successfully!")
        print(instructions)
    except Exception as e:
        logger.error(f"Error: {e}")
        raise
