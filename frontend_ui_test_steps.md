"""
Instructions for testing module permissions via the frontend UI

Follow these steps to test that module permissions are correctly saved when set through the frontend:

1. Log in to the application at http://localhost:5173 with the admin credentials
   - Username: administrator
   - Password: (your admin password)

2. Navigate to the Group Management page:
   - Click on the "Admin" or "Settings" section in the sidebar
   - Click on "Group Management"

3. Create a new group:
   - Click the "Create Group" button
   - Enter "UI Test Group" as the group name
   - Check the checkboxes for "maintenance" and "inventory" modules
   - Click "Save"

4. Verify that the group appears in the list with the correct module access
   - The UI Test Group should have modules: maintenance, inventory

5. Edit the group:
   - Click the edit icon for "UI Test Group"
   - Uncheck "inventory" and check "sales"
   - Click "Save"

6. Verify that the changes were saved:
   - The UI Test Group should now have modules: maintenance, sales (but not inventory)

7. Test persistence:
   - Refresh the page
   - Verify that UI Test Group still has the same module permissions

8. Delete the group:
   - Click the delete icon for "UI Test Group"
   - Confirm the deletion

9. Verify that the group was removed:
   - The UI Test Group should no longer appear in the list
   - If you create a new group with the same name, it should not have any module permissions initially

These steps will verify that the frontend correctly saves and persists module permissions.
"""
