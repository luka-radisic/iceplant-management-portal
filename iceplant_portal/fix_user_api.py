import os
import django
import inspect
import sys

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iceplant_core.settings')
django.setup()

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework import status
from django.apps import apps
from django.db.models import ForeignKey
from django.db import models

def find_all_related_models():
    """
    Find all models with ForeignKey to auth.User
    """
    related_models = []
    
    # Get all installed models
    for model in apps.get_models():
        # Check for related objects (reverse relationships)
        for related_object in model._meta.related_objects:
            if related_object.related_model == User:
                related_models.append((model, related_object))
        
        # Check fields (direct relationships)
        for field in model._meta.fields:
            if hasattr(field, 'remote_field') and field.remote_field and getattr(field.remote_field, 'model', None) == User:
                related_models.append((model, field))
    
    return related_models

def check_user_references(user_id):
    """
    Checks for all model references to a user.
    """
    try:
        user = User.objects.get(id=user_id)
        print(f"\nChecking references for user: {user.username} (ID: {user_id})")
        
        # Find all related models
        related_models = find_all_related_models()
        print(f"Found {len(related_models)} models with User foreign keys:")
        
        for model, field in related_models:
            print(f"  - {model.__name__}")
            try:
                # Find all instances of this model related to the user
                if hasattr(field, 'name'):
                    field_name = field.name
                    query = {field_name: user}
                    count = model.objects.filter(**query).count()
                    print(f"    - Field: {field_name}, Count: {count}")
                    
                    # List specific instances
                    if count > 0:
                        print(f"      Instances:")
                        for instance in model.objects.filter(**query)[:5]:  # Limit to 5 instances
                            print(f"        - {instance}")
                else:
                    # For reverse relations
                    accessor_name = field.get_accessor_name()
                    related_instances = getattr(user, accessor_name).all()
                    count = related_instances.count()
                    print(f"    - Accessor: {accessor_name}, Count: {count}")
                    
                    # List specific instances
                    if count > 0:
                        print(f"      Instances:")
                        for instance in related_instances[:5]:  # Limit to 5 instances
                            print(f"        - {instance}")
            except Exception as e:
                print(f"    Error checking references: {e}")
                
        # Check auth token specifically
        token_count = Token.objects.filter(user=user).count()
        print(f"Auth tokens: {token_count}")
                  
        return True
        
    except User.DoesNotExist:
        print(f"User with ID {user_id} does not exist")
        return False

def force_delete_user(user_id):
    """
    Directly execute SQL to force delete a user even if there are foreign key constraints.
    WARNING: This can leave dangling references in the database!
    """
    try:
        user = User.objects.get(id=user_id)
        print(f"\nWARNING: Force deleting user {user.username} (ID: {user_id}) with raw SQL")
        print("This bypasses Django's ORM foreign key checks and may leave dangling references!")
        
        # Use Django's cursor to execute raw SQL
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA foreign_keys = OFF;")  # Disable foreign key constraints in SQLite
            cursor.execute("DELETE FROM auth_user WHERE id = %s;", [user_id])
            cursor.execute("PRAGMA foreign_keys = ON;")  # Re-enable foreign key constraints
            
        print(f"User {user.username} (ID: {user_id}) force deleted. CAUTION: Database may have integrity issues!")
        return True
        
    except User.DoesNotExist:
        print(f"User with ID {user_id} does not exist")
        return False
    except Exception as e:
        print(f"Error force deleting user: {e}")
        return False

def add_api_fix():
    """
    Suggest fix for the API endpoint to properly handle user deletion
    """
    print("\nAdd this to your user_management/views.py file:")
    print("""
from rest_framework import status
from rest_framework.response import Response
from django.db import connection

class UserViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            username = instance.username
            user_id = instance.id
            
            # Delete token first
            Token.objects.filter(user=instance).delete()
            
            # Force delete the user with SQL
            with connection.cursor() as cursor:
                cursor.execute("PRAGMA foreign_keys = OFF;")  # Disable foreign key constraints in SQLite
                cursor.execute("DELETE FROM auth_user WHERE id = %s;", [user_id])
                cursor.execute("PRAGMA foreign_keys = ON;")  # Re-enable foreign key constraints
                
            return Response({"detail": f"User {username} successfully deleted"})
            
        except Exception as e:
            return Response(
                {"detail": f"Error deleting user: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    """)

if __name__ == "__main__":
    user_id = 6
    
    # Check references
    check_user_references(user_id)
    
    # Ask if user wants to force delete
    print("\nDo you want to force delete this user? [yes/no]")
    print("WARNING: This bypasses foreign key constraints and may leave dangling references!")
    choice = input("> ").lower().strip()
    
    if choice == 'yes':
        force_delete_user(user_id)
    else:
        print("User deletion aborted.")
    
    # Suggest fix
    add_api_fix() 