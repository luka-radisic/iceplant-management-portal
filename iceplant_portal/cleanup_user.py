import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iceplant_core.settings')
django.setup()

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

# User to clean up
user_id = 6

try:
    user = User.objects.get(id=user_id)
    
    # Step 1: Delete token
    print(f"Deleting token for user {user.username}...")
    token_count, _ = Token.objects.filter(user=user).delete()
    print(f"Deleted {token_count} token")
    
    # Step 2: Reassign expenses
    print("Reassigning expenses...")
    admin_user = User.objects.filter(is_superuser=True).first()
    if not admin_user:
        print("No admin user found. Creating a cleanup user...")
        admin_user = User.objects.create_superuser(
            username="cleanup_admin",
            email="cleanup@example.com",
            password="temp12345"
        )
    
    expense_count = 0
    for expense in user.created_expenses.all():
        expense.created_by = admin_user
        expense.save()
        expense_count += 1
    
    # Also check approved expenses
    approved_count = 0
    for expense in user.approved_expenses.all():
        expense.approved_by = admin_user
        expense.save()
        approved_count += 1
    
    print(f"Reassigned {expense_count} created expenses and {approved_count} approved expenses")
    print(f"Cleanup completed, user {user.username} (ID: {user_id}) can now be deleted")
    
except User.DoesNotExist:
    print(f"User with ID {user_id} does not exist")
except Exception as e:
    print(f"Error occurred: {e}") 