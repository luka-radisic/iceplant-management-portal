# Generated by Django 5.1 on 2025-04-01 08:15

from django.db import migrations
from django.contrib.auth.management import create_permissions

def assign_permissions(apps, group_name, permissions_codenames):
    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')
    ContentType = apps.get_model('contenttypes', 'ContentType')

    group, created = Group.objects.get_or_create(name=group_name)
    if not created:
        # Clear existing permissions if group already exists, to ensure idempotency
        group.permissions.clear()

    # Find permissions based on codenames
    permissions_to_add = []
    for app_label, codename in permissions_codenames:
        try:
            # Django automatically creates permissions for models, find them
            # For models like Sale in 'sales' app, codename is e.g., 'view_sale'
            # Custom permissions are found similarly, e.g., ('expenses', 'approve_expense')
            perm = Permission.objects.get(content_type__app_label=app_label, codename=codename)
            permissions_to_add.append(perm)
        except Permission.DoesNotExist:
            print(f"Warning: Permission {app_label}.{codename} not found. Skipping.")
        except ContentType.DoesNotExist:
             print(f"Warning: ContentType for app {app_label} not found. Skipping permission {codename}.")
             
    # Add the found permissions to the group
    if permissions_to_add:
        group.permissions.add(*permissions_to_add)
        print(f"Assigned {len(permissions_to_add)} permissions to group {group_name}")

def create_groups_and_assign_permissions(apps, schema_editor):
    # Ensure all permissions are created first (needed for Django versions < ~4.0)
    for app_config in apps.get_app_configs():
        app_config.models_module = True
        create_permissions(app_config, apps=apps, verbosity=0)
        app_config.models_module = None

    Group = apps.get_model('auth', 'Group')
    
    # Define groups and their permissions
    groups_permissions = {
        'Employee': [
            # Basic view permissions
            ('sales', 'view_sale'),
            ('inventory', 'view_inventoryitem'),
            ('inventory', 'view_inventoryadjustment'),
            ('expenses', 'view_expense'),
            ('expenses', 'view_expensecategory'),
            ('buyers', 'view_buyer'),
            ('attendance', 'view_attendance'), 
            ('attendance', 'view_employeeprofile'), # Assuming they can view profiles
            ('companyconfig', 'view_companysettings'),
        ],
        'Office': [
            # Inherits Employee permissions + more
            ('sales', 'view_sale'),
            ('inventory', 'view_inventoryitem'),
            ('inventory', 'view_inventoryadjustment'),
            ('expenses', 'view_expense'),
            ('expenses', 'add_expense'),
            ('expenses', 'change_expense'),
            ('expenses', 'view_expensecategory'),
            ('buyers', 'view_buyer'),
            ('attendance', 'view_attendance'), 
            ('attendance', 'view_employeeprofile'),
            ('companyconfig', 'view_companysettings'),
        ],
        'Sales': [
            # Inherits Employee permissions + sales/buyer focus
            ('sales', 'view_sale'),
            ('sales', 'add_sale'),
            ('sales', 'change_sale'),
            # ('sales', 'delete_sale'), # Decide if they can delete
            ('inventory', 'view_inventoryitem'),
            ('inventory', 'view_inventoryadjustment'),
            ('expenses', 'view_expense'),
            ('expenses', 'view_expensecategory'),
            ('buyers', 'view_buyer'),
            ('buyers', 'add_buyer'),
            ('buyers', 'change_buyer'),
            # ('buyers', 'delete_buyer'), # Decide if they can delete
            ('attendance', 'view_attendance'), 
            ('attendance', 'view_employeeprofile'),
            ('companyconfig', 'view_companysettings'),
        ],
        'HR': [
            # Inherits Employee permissions + attendance/employee focus
            ('sales', 'view_sale'),
            ('inventory', 'view_inventoryitem'),
            ('inventory', 'view_inventoryadjustment'),
            ('expenses', 'view_expense'),
            ('expenses', 'view_expensecategory'),
            # ('expenses', 'approve_expense'), # Decide if HR approves expenses
            ('buyers', 'view_buyer'),
            ('attendance', 'view_attendance'), 
            ('attendance', 'add_attendance'), 
            ('attendance', 'change_attendance'), 
            ('attendance', 'delete_attendance'), 
            ('attendance', 'import_attendance'), # Custom permission
            ('attendance', 'view_employeeprofile'),
            ('attendance', 'add_employeeprofile'),
            ('attendance', 'change_employeeprofile'),
            ('attendance', 'delete_employeeprofile'),
            ('attendance', 'view_departmentshift'), 
            ('attendance', 'add_departmentshift'), 
            ('attendance', 'change_departmentshift'), 
            ('attendance', 'delete_departmentshift'), 
            ('companyconfig', 'view_companysettings'),
        ],
    }
    
    # Create groups and assign permissions
    for group_name, permissions_codenames in groups_permissions.items():
        assign_permissions(apps, group_name, permissions_codenames)

def remove_groups(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    
    groups_to_remove = [
        'HR',
        'Sales',
        'Office',
        'Employee',
    ]
    
    Group.objects.filter(name__in=groups_to_remove).delete()
    print(f'Deleted groups: {groups_to_remove}')


class Migration(migrations.Migration):

    # initial = True # Remove initial=True if it's not the very first migration

    dependencies = [
        # Add dependency on the auth app's migrations that create Permission model
        ('auth', '__latest__'), 
        # Add dependencies on the latest migration of each app whose models we need permissions for
        ('attendance', '0017_alter_importlog_options_importlog_user'),
        ('sales', '__latest__'),
        ('inventory', '__latest__'),
        ('expenses', '__latest__'),
        ('buyers', '__latest__'),
        ('companyconfig', '__latest__'),
        # Add any other apps here
    ]

    operations = [
        # Changed RunPython function name
        migrations.RunPython(create_groups_and_assign_permissions, reverse_code=remove_groups),
    ]
