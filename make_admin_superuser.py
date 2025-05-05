"""
Simple script to make the 'administrator' user a superuser and add them to the 'Admins' group.
Copy this to the Django project directory and run it with Django's shell.
"""

from django.contrib.auth.models import User, Group

# Find the administrator user
try:
    user = User.objects.get(username='administrator')
    print(f"Found user: {user.username}")
    
    # Make the user a superuser
    if not user.is_superuser:
        user.is_superuser = True
        user.is_staff = True
        user.save()
        print("User is now a superuser")
    else:
        print("User was already a superuser")
    
    # Create Admins group if it doesn't exist
    admins_group, created = Group.objects.get_or_create(name='Admins')
    if created:
        print("Created 'Admins' group")
    else:
        print("'Admins' group already existed")
    
    # Add user to Admins group if not already a member
    if admins_group not in user.groups.all():
        user.groups.add(admins_group)
        print(f"Added user to 'Admins' group")
    else:
        print("User was already in 'Admins' group")
    
except User.DoesNotExist:
    print("User 'administrator' not found")
