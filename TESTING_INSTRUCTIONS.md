# Testing Instructions for Module Permissions System

## Testing the Fix in Production

After deploying the module permissions system, use these steps to verify that the fix is working correctly.

### 1. Access Testing

#### For HR Payrol Users

1. **Login as HR Payrol User**
   - Login with credentials of a user in the HR Payrol group

2. **Verify Module Access**
   - Confirm they can access the Attendance module
   - Confirm they can access the Expenses module
   - Confirm they cannot access other modules (Sales, Inventory, etc.)

3. **Test After Restart**
   - Ask the system administrator to restart the server
   - Log back in and verify access is still correct

#### For Admin Users

1. **Login as Admin**
   - Login with admin credentials

2. **Verify Django Admin Permissions**
   - Go to Django Admin (usually at `/admin/`)
   - Navigate to Groups
   - Open the HR Payrol group
   - Verify that the permissions include:
     - `iceplant_core | modulepermission | Can access attendance module`
     - `iceplant_core | modulepermission | Can access expenses module`

3. **Test Permission Changes**
   - Remove one of the permissions (e.g., expenses)
   - Save the group
   - Log in as an HR Payrol user and verify they can no longer access that module
   - Add the permission back
   - Verify access is restored

### 2. Persistence Testing

1. **Check All Permission Files**
   Check that `module_permissions.json` exists and contains correct data at these locations:
   ```
   /path/to/iceplant-management-portal/module_permissions.json
   /path/to/iceplant-management-portal/iceplant_portal/module_permissions.json
   /path/to/iceplant-management-portal/iceplant_portal/iceplant_core/module_permissions.json
   ```

2. **Test Multiple Restarts**
   - Restart the server
   - Verify HR Payrol permissions still work
   - Restart the server again
   - Verify permissions are still intact

### 3. Frontend Module Access Testing

1. **Test Module Assignment in UI**
   - Login as an admin user
   - Navigate to the group management page
   - Find or create a test group
   - Assign module permissions to this group
   - Verify the changes are:
     - Visible in the frontend UI
     - Applied in the Django admin interface
     - Persisted after server restart

### 4. Using Management Command

If issues are found, the management command can be used to fix them:

```bash
# Sync all groups
python manage.py sync_module_permissions

# Sync a specific group
python manage.py sync_module_permissions --group "HR Payrol"
```

## Reporting Issues

If you encounter any issues during testing:

1. Check the application logs for errors
2. Note the specific steps that led to the issue
3. Document whether the issue is consistent or intermittent
4. Report the issue with these details

## Expected Results

After successful deployment, you should observe:

1. HR Payrol group has correct permissions in Django admin
2. Users in HR Payrol can access attendance and expenses modules
3. Permissions persist across server restarts
4. Changes made through the frontend are reflected in the Django admin

These testing instructions help verify that the module permissions system is functioning as expected.
