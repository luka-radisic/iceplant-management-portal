# Administrator Guide: Managing User Permissions

## Introduction

This guide provides step-by-step instructions for managing user permissions through the Group Management system in the Iceplant Management Portal. As an administrator, you can control which users have access to which modules by assigning them to appropriate groups.

## Understanding the Permission System

### Key Concepts

1. **Users**: Individual accounts that can log in to the system
2. **Groups**: Collections of users that share the same permissions
3. **Modules**: Functional areas of the application (e.g., Attendance, Sales, Inventory)
4. **Module Permissions**: Mapping between groups and the modules they can access

### Permission Hierarchy

The permission system works in the following order:

1. **Superuser**: Has access to everything regardless of group membership
2. **Group Member**: Has access to modules allowed for their group(s)
3. **Regular User**: Has access only to their own profile if not in any groups

## Accessing Group Management

1. Log in as a user with administrative privileges
2. From the Dashboard, click on the gear icon or "Admin" in the navigation menu
3. Select "Group Management" from the dropdown

> **Note**: If you don't see the Group Management option, ensure your account has superuser privileges.

## Managing Groups

### Viewing Groups

The Group Management page displays a table with all existing groups and their details:
- Group name
- Number of users in the group
- Module access
- Actions (Edit/Delete)

### Creating a New Group

1. Click the "Add Group" button at the top of the Group Management page
2. In the dialog that appears:
   - Enter a name for the group
   - Select the modules this group should have access to by checking the appropriate boxes
3. Click "Save" to create the group

### Editing a Group

1. Find the group you want to edit in the table
2. Click the pencil icon in the Actions column
3. In the dialog that appears:
   - Modify the group name if needed
   - Update module access by checking/unchecking modules
4. Click "Save" to apply your changes

### Deleting a Group

1. Find the group you want to delete in the table
2. Click the trash icon in the Actions column
3. Confirm the deletion when prompted

> **Warning**: Deleting a group will remove all users from that group and revoke their access to modules allowed by that group.

## Managing Users in Groups

### Adding Users to a Group

1. Navigate to the "User Management" page from the Admin menu
2. Find the user you want to add to a group
3. Click "Assign Groups" for that user
4. In the dialog that appears, check the groups you want to assign the user to
5. Click "Save" to apply the changes

### Removing Users from a Group

1. Navigate to the "User Management" page
2. Find the user you want to modify
3. Click "Assign Groups" for that user
4. In the dialog, uncheck the groups you want to remove the user from
5. Click "Save" to apply the changes

## Default Groups and Their Purposes

The system comes with several predefined groups:

1. **Admins**: Full access to all modules and administrative functions
2. **Managers**: Access to reporting and overview features across most modules
3. **HR**: Access to attendance and employee management features
4. **Sales**: Access to sales and customer-related features
5. **Accounting**: Access to financial and expense tracking features
6. **Inventory**: Access to inventory management features
7. **Maintenance**: Access to equipment maintenance features
8. **Operations**: Access to operational modules like inventory and maintenance

## Module Access Overview

The system includes the following modules that can be assigned to groups:

1. **Attendance**: Employee time tracking and attendance reports
2. **Sales**: Customer orders, invoices, and sales reporting
3. **Inventory**: Stock management and tracking
4. **Expenses**: Financial tracking and expense management
5. **Maintenance**: Equipment maintenance scheduling and tracking
6. **Buyers**: Customer and buyer management

## Best Practices

1. **Create Role-Based Groups**: Structure groups around roles in your organization rather than individuals
2. **Limit Superuser Accounts**: Only create a minimal number of superuser accounts
3. **Regular Audit**: Periodically review group memberships and permissions
4. **Principle of Least Privilege**: Assign only the permissions necessary for users to perform their duties
5. **Document Custom Groups**: Maintain documentation of any custom groups you create and their purposes

## Troubleshooting

### Common Issues

1. **User can't access a module**:
   - Verify the user belongs to a group that has access to that module
   - Check if the module permissions mapping includes the user's group

2. **Changes to group permissions not taking effect**:
   - Ensure the user has logged out and logged back in
   - Verify the changes were properly saved

3. **Can't create or modify groups**:
   - Verify you're logged in as a superuser
   - Check browser console for any API errors

### Getting Help

If you encounter issues that you can't resolve using this guide:

1. Check the system logs for error messages
2. Contact your system administrator or IT support team
3. Reference the technical documentation for more detailed information

## Conclusion

Effective management of user permissions through the Group Management system is essential for maintaining security while ensuring users have access to the features they need. By following this guide, you can configure access controls that align with your organization's structure and security requirements.

Remember that changes to permissions may affect user productivity, so it's advisable to communicate any significant changes to affected users before implementing them.
