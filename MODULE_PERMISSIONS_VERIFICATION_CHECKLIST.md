# Module Permissions Verification Checklist

This checklist provides a structured way to verify that the module permissions system fix has been successfully implemented and that the specific issues with HR Payrol group permissions have been resolved.

## Pre-Deployment Verification

- [x] Complete code implementation
- [x] Create deployment scripts
- [x] Document the solution
- [x] Create test scripts

## Deployment Verification

- [ ] Run deployment script successfully
- [ ] Run HR Payrol specific fix
- [ ] Execute Django management command to sync permissions
- [ ] Restart server without errors

## System Verification

### File System Checks

- [ ] Verify module_permissions.json exists in the root directory
- [ ] Verify module_permissions.json exists in iceplant_portal directory
- [ ] Verify module_permissions.json exists in iceplant_core directory
- [ ] Verify file contents are consistent across all locations

### Django Admin Interface Checks

- [ ] Login to Django admin interface
- [ ] Navigate to Groups section
- [ ] Verify HR Payrol group has the following permissions:
  - [ ] access_attendance_module
  - [ ] access_expenses_module
- [ ] Verify other groups have appropriate module permissions

### Frontend API Checks

- [ ] Login as an admin user
- [ ] Navigate to group management page
- [ ] Update module permissions for a test group
- [ ] Verify changes appear in Django admin
- [ ] Verify permissions are saved to all module_permissions.json files

### User Access Checks

- [ ] Login as a user in HR Payrol group
- [ ] Verify access to attendance module works
- [ ] Verify access to expenses module works
- [ ] Verify access is denied to other modules
- [ ] Logout and login after server restart to verify persistence

## HR Payrol Specific Verification

- [ ] Verify HR Payrol group exists in Django admin
- [ ] Verify Django permissions for attendance and expenses are assigned
- [ ] Verify HasModulePermission mappings include HR Payrol for attendance and expenses
- [ ] Test access with a user in the HR Payrol group

## Server Restart Tests

- [ ] Restart server
- [ ] Verify module permissions are loaded correctly on startup
- [ ] Verify HR Payrol permissions persist after restart
- [ ] Verify all groups retain correct module access after restart

## Logging and Monitoring

- [ ] Check server logs for any permission-related errors
- [ ] Verify app.py initialization logging is present
- [ ] Monitor access attempts for any permission issues

## Final Sign-off

- [ ] All verification steps passed
- [ ] No permission-related errors in logs
- [ ] HR Payrol users confirm proper access to modules
- [ ] System administrators confirm Django admin shows correct permissions

## Notes

- If any verification step fails, use the sync_module_permissions management command to reset the system
- For HR Payrol specific issues, use the fix_hr_payrol_permissions.py script
- Document any unexpected behavior for future reference
