# Administrator's Guide to Module Permissions

## Introduction

This guide explains how to manage module permissions in the IcePlant Management Portal. Module permissions control which user groups can access different functional areas of the application.

## Understanding Module Permissions

Module permissions are built on two core concepts:

1. **Modules**: Functional areas of the application (e.g., Attendance, Sales, Inventory)
2. **Groups**: Collections of users with similar roles (e.g., HR, Sales, Accounting)

When a group is assigned to a module, users in that group gain access to the module's functionality.

## The Group Management Page

The Group Management page is the primary interface for managing user groups and their module access.

### Accessing the Page

1. Log in as an administrator
2. Navigate to **Admin > Group Management**

### Available Actions

From this page, you can:

- View existing groups
- Create new groups
- Edit existing groups
- Delete groups
- Manage which modules each group can access

## Managing Groups

### Creating a New Group

1. Click the **+ Create Group** button
2. Enter a name for the group
3. Select which modules the group should have access to
4. Click **Save**

Example: To create a "Sales Managers" group with access to the Sales and Buyers modules:
- Enter "Sales Managers" as the name
- Check the boxes for "Sales" and "Buyers" modules
- Click Save

### Editing a Group

1. Find the group in the list
2. Click the **Edit** button (pencil icon)
3. Make changes to the group name or module access
4. Click **Save**

### Deleting a Group

1. Find the group in the list
2. Click the **Delete** button (trash icon)
3. Confirm the deletion when prompted

**Warning**: Deleting a group will revoke all associated permissions immediately and cannot be undone.

## Module Permission Logic

Each module in the system maps to specific functionality:

| Module | Description | Typical Users |
|--------|-------------|--------------|
| Attendance | Employee attendance tracking | HR staff |
| Sales | Sales transactions and records | Sales staff, Accountants |
| Inventory | Stock and inventory management | Warehouse staff, Operations |
| Expenses | Expense tracking and management | Finance staff, Accountants |
| Maintenance | Equipment and facility maintenance | Maintenance staff, Operations |
| Buyers | Customer and buyer management | Sales staff, Customer Relations |

## Using the Command Line Tools

For advanced administration, you can use the `moduleperms` management command.

### Viewing Current Module Permissions

```bash
python manage.py moduleperms --list
```

### Synchronizing Module Permissions

If permissions seem out of sync, run:

```bash
python manage.py moduleperms --sync
```

### Adding Module Access for a Group

```bash
python manage.py moduleperms --add-module inventory,Warehouse
```

This adds access to the inventory module for the Warehouse group.

### Removing Module Access from a Group

```bash
python manage.py moduleperms --remove-module sales,HR
```

This removes access to the sales module from the HR group.

### Checking Permission Validity

To verify if all mapped permissions actually exist in the database:

```bash
python manage.py moduleperms --check
```

### Exporting and Importing Permissions

Export current permissions to a file:

```bash
python manage.py moduleperms --export module_permissions_backup.json
```

Import permissions from a file:

```bash
python manage.py moduleperms --import module_permissions_backup.json
```

## Troubleshooting

### User can't access a module

1. Check if the user is a member of a group that has access to the module
2. Verify that the group has the module assigned (use the Group Management page)
3. Run the sync command to ensure permissions are properly assigned:
   ```bash
   python manage.py moduleperms --sync
   ```

### Changes to module permissions aren't showing up

1. The browser might be caching old data - try refreshing the page or clearing cache
2. Run the sync command to ensure permissions are properly assigned
3. Check if the user needs to log out and back in for changes to take effect

### Error messages about missing permissions

If you see errors about permissions not existing:
1. Run `python manage.py moduleperms --check` to verify which permissions are missing
2. Ensure the app with missing permissions is properly installed and migrations have been run

## Best Practices

1. **Use descriptive group names** that reflect the role or function (e.g., "Sales Team" rather than "Group 1")

2. **Follow the principle of least privilege** - only assign modules that are necessary for each group's function

3. **Use Admins group sparingly** - it has access to all modules, so only assign trusted users

4. **Audit permissions regularly** - use the `--list` command to review current permissions

5. **Back up your permissions** - use the `--export` command to create backups before making major changes

## Default Module-Group Mapping

The system comes with the following default module-group mapping:

```
attendance: HR, Managers, Admins
sales: Sales, Accounting, Managers, Admins
inventory: Inventory, Operations, Managers, Admins
expenses: Accounting, Finance, Managers, Admins
maintenance: Maintenance, Operations, Managers, Admins
buyers: Sales, Accounting, Managers, Admins
```

These defaults can be modified as needed for your organization.
