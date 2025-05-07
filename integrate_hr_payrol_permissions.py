"""
Integration script to create Django permissions for modules and assign them to HR Payrol
This should be run in the Django shell: python manage.py shell < fix_hr_payrol_permissions.py
"""
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

# Log function
def log(msg):
    print(f"[C:\Users\Lukar\Documents\CMA-PH\iceplant-management-portal\fix_hr_payrol_permissions.py] {msg}")

log("Starting module permissions integration...")

# Get or create content type for module permissions
ct, created = ContentType.objects.get_or_create(
    app_label='iceplant_core',
    model='modulepermission'
)
log(f"ContentType: {ct}")

# Create permissions for each module
modules = ['attendance', 'sales', 'inventory', 'expenses', 'maintenance', 'buyers']
module_perms = {}

for module in modules:
    codename = f"access_{module}_module"
    name = f"Can access {module} module"
    
    perm, created = Permission.objects.get_or_create(
        content_type=ct,
        codename=codename,
        defaults={'name': name}
    )
    
    module_perms[module] = perm
    log(f"Permission for {module}: {perm.codename}")

# Get HR Payrol group
try:
    hr_payrol = Group.objects.get(name="HR Payrol")
    log(f"Found HR Payrol group: {hr_payrol.id}")
    
    # From module permissions files, HR Payrol should have access to these modules
    hr_modules = {'attendance', 'expenses'}
    
    # Assign permissions to HR Payrol
    with transaction.atomic():
        for module in hr_modules:
            if module in module_perms:
                hr_payrol.permissions.add(module_perms[module])
                log(f"Added {module} permission to HR Payrol")
    
    # Check permissions
    perms = hr_payrol.permissions.all()
    log(f"HR Payrol now has {perms.count()} permissions:")
    for perm in perms:
        log(f"  - {perm.codename}: {perm.name}")
    
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
                log(f"Added HR Payrol to {module} in MODULE_GROUP_MAPPING")
    
    # Save to all locations
    save_module_permissions()
    log("Updated module permissions saved")
except Exception as e:
    log(f"Error syncing with HasModulePermission: {e}")
