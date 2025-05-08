# Module Permissions Fix - Rollback Plan

This document outlines the steps to roll back changes if issues are encountered during or after deployment of the module permissions system fix.

## Backup Files

The deployment script automatically creates backups of modified files with a `.bak` extension. These can be used to restore the original functionality.

## Rollback Steps

### 1. Restore Original Files

#### Linux/Mac
```bash
# Navigate to project directory
cd /path/to/iceplant-management-portal

# Restore core files from backups
mv iceplant_portal/iceplant_core/module_permissions_system.py.bak iceplant_portal/iceplant_core/module_permissions_system.py
mv iceplant_portal/iceplant_core/management/commands/sync_module_permissions.py.bak iceplant_portal/iceplant_core/management/commands/sync_module_permissions.py
mv iceplant_portal/iceplant_core/apps.py.bak iceplant_portal/iceplant_core/apps.py
mv iceplant_portal/users/api_views_groups.py.bak iceplant_portal/users/api_views_groups.py
mv iceplant_portal/iceplant_core/module_permissions_utils.py.bak iceplant_portal/iceplant_core/module_permissions_utils.py
```

#### Windows
```powershell
# Navigate to project directory
cd C:\path\to\iceplant-management-portal

# Restore core files from backups
Copy-Item iceplant_portal\iceplant_core\module_permissions_system.py.bak iceplant_portal\iceplant_core\module_permissions_system.py -Force
Copy-Item iceplant_portal\iceplant_core\management\commands\sync_module_permissions.py.bak iceplant_portal\iceplant_core\management\commands\sync_module_permissions.py -Force
Copy-Item iceplant_portal\iceplant_core\apps.py.bak iceplant_portal\iceplant_core\apps.py -Force
Copy-Item iceplant_portal\users\api_views_groups.py.bak iceplant_portal\users\api_views_groups.py -Force
Copy-Item iceplant_portal\iceplant_core\module_permissions_utils.py.bak iceplant_portal\iceplant_core\module_permissions_utils.py -Force
```

### 2. Restore Original Module Permissions

#### Option 1: Use Original JSON Files
If you have backup copies of the original module_permissions.json files, restore them:

```bash
# Linux/Mac
cp module_permissions.json.bak module_permissions.json
cp iceplant_portal/module_permissions.json.bak iceplant_portal/module_permissions.json
cp iceplant_portal/iceplant_core/module_permissions.json.bak iceplant_portal/iceplant_core/module_permissions.json

# Windows
Copy-Item module_permissions.json.bak module_permissions.json -Force
Copy-Item iceplant_portal\module_permissions.json.bak iceplant_portal\module_permissions.json -Force
Copy-Item iceplant_portal\iceplant_core\module_permissions.json.bak iceplant_portal\iceplant_core\module_permissions.json -Force
```

#### Option 2: Use Original File from Git Repository
If the files are tracked in Git, you can restore them from the repository:

```bash
git checkout -- module_permissions.json
git checkout -- iceplant_portal/module_permissions.json
git checkout -- iceplant_portal/iceplant_core/module_permissions.json
```

### 3. Remove New Files

Remove any new files created by the deployment:

```bash
# Linux/Mac
rm -f fix_hr_payrol_permissions.sh
rm -f fix_hr_payrol_permissions.bat
rm -f fix_hr_payrol_permissions.sql
rm -f integrate_hr_payrol_permissions.py
rm -f deploy_module_permissions.sh
rm -f deploy_module_permissions.ps1

# Windows
Remove-Item fix_hr_payrol_permissions.sh -Force
Remove-Item fix_hr_payrol_permissions.bat -Force
Remove-Item fix_hr_payrol_permissions.sql -Force
Remove-Item integrate_hr_payrol_permissions.py -Force
Remove-Item deploy_module_permissions.sh -Force
Remove-Item deploy_module_permissions.ps1 -Force
```

### 4. Revert Django Permissions (if necessary)

If the Django permissions have already been modified, you'll need to reset them via Django shell:

```python
# In Django shell (python manage.py shell)
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.models import Permission

# Delete the module permissions content type
ct = ContentType.objects.filter(app_label='iceplant_core', model='modulepermission').first()
if ct:
    Permission.objects.filter(content_type=ct).delete()
    ct.delete()
    print("Deleted module permissions content type and all related permissions")
```

### 5. Restart the Server

After restoring the original files, restart the Django server:

```bash
# If using systemd
sudo systemctl restart iceplant_portal

# If using Docker
docker-compose restart web
```

### 6. Verify Original Behavior

After rolling back, verify that the system has returned to its original state:

1. Check that the HR Payrol group has its original permissions
2. Verify that module permissions are loaded from the correct file
3. Test module access for a few users to ensure it's working as expected

## Emergency Contact

If you encounter issues during rollback that cannot be resolved using this guide:

1. Contact the development team lead at [contact information]
2. Report the specific error messages and steps that were taken
3. Provide any relevant log files or error output

## Notes

- Keep all backup files until you've confirmed the system is stable
- Document any issues encountered during rollback for future reference
- If the rollback is due to a specific bug in the new system, consider creating a new issue in the project tracker
