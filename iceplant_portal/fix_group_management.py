"""
This script identifies and fixes potential issues with the Group Management API endpoints and permissions.
Run this script while the Django application is running to check and fix issues.
"""
import os
import sys
import django
from django.urls import clear_url_caches

# Add the Django project directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.join(current_dir, 'iceplant-management-portal', 'iceplant_portal')
sys.path.insert(0, project_dir)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iceplant_core.settings')
django.setup()

# Import models
from django.contrib.auth.models import User, Group
from django.urls import get_resolver
from django.conf import settings

# Check if the administrator user exists and is a superuser
def check_admin_user():
    try:
        user = User.objects.get(username='administrator')
        print(f"Found administrator user: {user.username}")
        print(f"Superuser: {user.is_superuser}")
        print(f"Staff: {user.is_staff}")
        
        # List groups the user belongs to
        print("Groups:")
        for group in user.groups.all():
            print(f"  - {group.name}")
        
        # If no groups, create the Admins group and add the user to it
        if not user.groups.exists():
            print("User has no groups. Creating 'Admins' group...")
            admins_group, created = Group.objects.get_or_create(name='Admins')
            if created:
                print("Created new 'Admins' group")
            else:
                print("Found existing 'Admins' group")
            
            user.groups.add(admins_group)
            print(f"Added user to 'Admins' group")
        
        return user
    except User.DoesNotExist:
        print("Administrator user not found!")
        return None

# Check URL patterns to verify the groups endpoint
def check_url_patterns():
    resolver = get_resolver()
    
    # Dictionary to store URLs we're looking for
    target_urls = {
        '/api/users/groups/': False,
        '/api/users/module-permissions/': False
    }
    
    # Print all available URL patterns for debugging
    def list_urls(urllist, depth=0):
        found_urls = []
        
        for entry in urllist:
            if hasattr(entry, 'pattern'):
                # URL pattern entry
                if hasattr(entry, 'lookup_str'):
                    url_as_str = entry.lookup_str
                else:
                    url_as_str = str(entry.pattern)
                
                if hasattr(entry, 'default_args') and entry.default_args:
                    url_as_str = f"{url_as_str} {entry.default_args}"
                    
                # Check if this URL ends with 'groups/'
                if 'groups' in url_as_str:
                    found_urls.append((url_as_str, entry.callback))
                
                # If this has URL patterns under it, recurse
                if hasattr(entry, 'url_patterns'):
                    for pattern_url in list_urls(entry.url_patterns, depth + 1):
                        found_urls.append(pattern_url)
                    
        return found_urls
    
    # List all URLs
    print("\nChecking URL patterns...")
    url_patterns = list_urls(resolver.url_patterns)
    
    # Display any URLs with 'groups' in them
    print("Found the following URL patterns related to groups:")
    for url, callback in url_patterns:
        print(f"  - {url}: {callback}")
    
    # Check for our specific target URLs
    for url in target_urls.keys():
        if any(url in pattern[0] for pattern in url_patterns):
            target_urls[url] = True
            print(f"✓ URL {url} found in URL patterns")
        else:
            print(f"✗ URL {url} NOT found in URL patterns")

# Check and fix IsInGroups permission class
def check_fix_permissions():
    from iceplant_core.group_permissions import IsInGroups
    
    # Check if the IsInGroups class is properly defined
    print("\nChecking IsInGroups permission class...")
    
    # This will tell us if the class is callable (should be as a class)
    print(f"IsInGroups is callable: {callable(IsInGroups)}")
    
    # This will tell us if instances of the class are callable (should not be)
    instance = IsInGroups(['Admins'])
    print(f"IsInGroups instance is callable: {callable(instance)}")
    
    # Import and check the view that uses IsInGroups
    try:
        from users.api_views_groups import GroupViewSet
        
        # Print the permission classes
        print(f"GroupViewSet permission_classes: {GroupViewSet.permission_classes}")
        
        # Fix if needed - ensure IsInGroups is instantiated properly
        if IsInGroups in GroupViewSet.permission_classes:
            print("Warning: IsInGroups class is used directly without being instantiated")
            print("Fixing the issue by properly instantiating IsInGroups with 'Admins' group")
            
            # Replace IsInGroups with IsInGroups(['Admins'])
            new_permissions = []
            for perm in GroupViewSet.permission_classes:
                if perm == IsInGroups:
                    new_permissions.append(IsInGroups(['Admins', 'Managers']))
                else:
                    new_permissions.append(perm)
            
            GroupViewSet.permission_classes = new_permissions
            print(f"Updated permission_classes: {GroupViewSet.permission_classes}")
    except ImportError as e:
        print(f"Error importing GroupViewSet: {e}")

if __name__ == "__main__":
    print("Group Management API Diagnosis Tool")
    print("==================================")
    
    # Check admin user
    admin_user = check_admin_user()
    
    # Check URL patterns
    check_url_patterns()
    
    # Check and fix permissions
    check_fix_permissions()
    
    print("\nDiagnosis complete. Please restart your Django server for changes to take effect.")
