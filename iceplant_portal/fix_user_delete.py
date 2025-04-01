import os
import sys
import django

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

from django.contrib.auth.models import User
from django.db.models import ForeignKey, CASCADE, SET_NULL, PROTECT
from django.apps import apps
from django.db import models
from django.db.models.deletion import Collector
from django.db import transaction, connection

def find_user_references(user_id):
    """Find all models with foreign keys to the specified user"""
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        print(f"User with ID {user_id} does not exist")
        return None, None

    references = {}
    
    # Iterate through all models in all apps
    for model in apps.get_models():
        # Look for ForeignKey fields to User
        for field in model._meta.fields:
            if isinstance(field, ForeignKey) and field.related_model == User:
                # Check if there are references to this user
                field_name = field.name
                filter_kwargs = {field_name: user}
                count = model.objects.filter(**filter_kwargs).count()
                
                if count > 0:
                    model_name = f"{model._meta.app_label}.{model._meta.model_name}"
                    references[model_name] = {
                        'model': model,
                        'field': field_name,
                        'count': count,
                        'on_delete': field.remote_field.on_delete.__name__
                    }
    
    return user, references

def collect_related_objects(user):
    """Use Django's Collector to find all related objects"""
    collector = Collector(using='default')
    collector.collect([user])
    
    # Get all the collected objects grouped by model
    collected_objects = {}
    for model, instances in collector.data.items():
        model_name = f"{model._meta.app_label}.{model._meta.model_name}"
        collected_objects[model_name] = len(instances)
    
    return collected_objects

def analyze_db_constraints(user_id):
    """
    Analyze database constraints for a user and provide recommendations
    for handling foreign key constraints before deletion.
    """
    user, references = find_user_references(user_id)
    
    if not user:
        return
    
    # Also collect related objects using Django's Collector
    collected_objects = collect_related_objects(user)

    print(f"\nAnalyzing constraints for user: {user.username} (ID: {user_id})")
    print("-" * 70)
    
    if not references and not collected_objects:
        print("No foreign key references found. User can be safely deleted.")
        return
    
    print(f"Found {len(references)} models with direct references to this user:\n")
    
    protect_constraints = []
    cascade_references = []
    set_null_references = []
    other_references = []
    
    for model_name, info in references.items():
        print(f"• {model_name}: {info['count']} references via '{info['field']}' field (on_delete={info['on_delete']})")
        
        if info['on_delete'] == 'PROTECT':
            protect_constraints.append((model_name, info))
        elif info['on_delete'] == 'CASCADE':
            cascade_references.append((model_name, info))
        elif info['on_delete'] == 'SET_NULL':
            set_null_references.append((model_name, info))
        else:
            other_references.append((model_name, info))
    
    # Also show objects that would be deleted by CASCADE
    if collected_objects:
        print(f"\nDjango will collect the following objects for deletion:")
        for model_name, count in collected_objects.items():
            if model_name != 'auth.user':  # Skip the user itself
                print(f"• {model_name}: {count} objects")
    
    print("\nConstraint Analysis:")
    print("-" * 70)
    
    if protect_constraints:
        print("\n⚠️ DELETION BLOCKERS (on_delete=PROTECT):")
        for model_name, info in protect_constraints:
            print(f"  • {model_name}: {info['count']} references must be manually handled before deletion")
    
    if cascade_references:
        print("\n🔄 CASCADE DELETIONS (on_delete=CASCADE):")
        for model_name, info in cascade_references:
            print(f"  • {model_name}: {info['count']} references will be automatically deleted")
    
    if set_null_references:
        print("\n🆓 NULL REFERENCES (on_delete=SET_NULL):")
        for model_name, info in set_null_references:
            print(f"  • {model_name}: {info['count']} references will be set to NULL")
    
    if other_references:
        print("\n❓ OTHER CONSTRAINTS:")
        for model_name, info in other_references:
            print(f"  • {model_name}: {info['count']} references with on_delete={info['on_delete']}")
    
    return references, protect_constraints

def fix_references(user_id, target_user_id=None, force=False):
    """
    Fix references to allow user deletion:
    1. For PROTECT constraints, reassign records to target_user
    2. For CASCADE constraints, they'll be handled automatically
    3. For SET_NULL constraints, they'll be handled automatically
    """
    user, references = find_user_references(user_id)
    
    if not user or not references:
        return True  # No references to fix
    
    if target_user_id:
        try:
            target_user = User.objects.get(pk=target_user_id)
        except User.DoesNotExist:
            print(f"Target user with ID {target_user_id} does not exist")
            return False
    else:
        # Find a superuser to reassign references to
        target_user = User.objects.filter(is_superuser=True).exclude(pk=user_id).first()
        if not target_user:
            print("No other superuser found to reassign references. Please specify a target user ID.")
            return False
    
    print(f"\nReassigning references from {user.username} to {target_user.username}...")
    
    # Handle protect and other constraints by reassigning
    for model_name, info in references.items():
        model = info['model']
        field_name = info['field']
        on_delete = info['on_delete']
        
        if on_delete == 'PROTECT' or force:
            filter_kwargs = {field_name: user}
            count_before = model.objects.filter(**filter_kwargs).count()
            
            if count_before > 0:
                print(f"Reassigning {count_before} records in {model_name}...")
                try:
                    update_kwargs = {field_name: target_user}
                    model.objects.filter(**filter_kwargs).update(**update_kwargs)
                    count_after = model.objects.filter(**filter_kwargs).count()
                    print(f"  ✓ {count_before - count_after} records reassigned")
                except Exception as e:
                    print(f"  ❌ Error reassigning: {str(e)}")
    
    # Recheck references after fixes
    _, remaining_refs = find_user_references(user_id)
    print("\nRemaining references after fixes:")
    if not remaining_refs:
        print("  ✓ No blocking references remain. User can now be deleted.")
        return True
    else:
        protect_refs = [(m, i) for m, i in remaining_refs.items() if i['on_delete'] == 'PROTECT']
        if protect_refs and not force:
            print("  ❌ Some PROTECT constraints still exist:")
            for model_name, info in protect_refs:
                print(f"    - {model_name}: {info['count']} references")
            return False
        else:
            print("  ✓ Only non-blocking constraints remain. User can now be deleted.")
            return True

def find_blocking_fk_tables(user_id):
    """Find tables with foreign key constraints that might block deletion"""
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        print(f"User with ID {user_id} does not exist")
        return None
    
    # For SQLite, we need to inspect table info using pragma commands
    with connection.cursor() as cursor:
        cursor.execute("PRAGMA foreign_key_list(auth_user)")
        foreign_keys = cursor.fetchall()
        
        tables_referencing_users = []
        for fk in foreign_keys:
            tables_referencing_users.append({
                'table': fk[2],  # Referenced table
                'from': fk[3],   # Column in referencing table
                'to': fk[4],     # Column in referenced table
                'on_update': fk[5],  # On update action
                'on_delete': fk[6],  # On delete action
            })
        
        return tables_referencing_users

def direct_db_fix_constraints(user_id, target_user_id):
    """Fix constraints directly at the database level as a last resort"""
    try:
        user = User.objects.get(pk=user_id)
        target_user = User.objects.get(pk=target_user_id)
    except User.DoesNotExist:
        print("User or target user does not exist")
        return False
    
    print(f"\nAttempting to fix constraints directly at database level...")
    
    # For SQLite, we can try a brute force approach
    # First we need to enable foreign keys if not already enabled
    with connection.cursor() as cursor:
        cursor.execute("PRAGMA foreign_keys = ON;")
        
        # Get a list of all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        for table in tables:
            table_name = table[0]
            # Skip Django internal tables
            if table_name.startswith('django_') or table_name == 'sqlite_sequence':
                continue
                
            # Check if this table has any columns that might reference users
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            
            potential_user_columns = []
            for col in columns:
                col_name = col[1]
                if ('user' in col_name.lower() or 
                    'author' in col_name.lower() or 
                    'owner' in col_name.lower() or
                    'creator' in col_name.lower() or
                    'approved_by' in col_name.lower()):
                    potential_user_columns.append(col_name)
            
            # Update any potential references
            for col_name in potential_user_columns:
                try:
                    print(f"Checking {table_name}.{col_name} for references to user {user_id}...")
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE {col_name} = ?", [user_id])
                    count = cursor.fetchone()[0]
                    
                    if count > 0:
                        print(f"  Found {count} references in {table_name}.{col_name}, reassigning to user {target_user_id}...")
                        cursor.execute(f"UPDATE {table_name} SET {col_name} = ? WHERE {col_name} = ?", 
                                      [target_user_id, user_id])
                        print(f"  ✓ {cursor.rowcount} rows updated")
                except Exception as e:
                    print(f"  ❌ Error updating {table_name}.{col_name}: {str(e)}")
    
    return True

def delete_user_safely(user_id, target_user_id=None, force=False):
    """
    Safely delete a user after handling foreign key constraints.
    """
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        print(f"User with ID {user_id} does not exist")
        return False
    
    # First analyze constraints
    analyze_db_constraints(user_id)
    
    # Try to fix references
    print("\nAttempting to fix foreign key constraints...")
    if not fix_references(user_id, target_user_id, force):
        if not target_user_id:
            print("No target user specified. Foreign key constraint issues remain.")
            return False
        
        # Try more aggressive fixing at DB level
        if not direct_db_fix_constraints(user_id, target_user_id):
            print("Failed to fix constraints even at DB level.")
            return False
    
    # As a last resort, temporarily disable foreign key checks (SQLite only)
    # WARNING: This is risky and could leave your database with dangling references
    if force:
        print("\n⚠️ WARNING: Using force option to temporarily disable foreign key checks.")
        print("This may leave your database in an inconsistent state!")
        
        # For SQLite
        with connection.cursor() as cursor:
            # Save current foreign keys setting
            cursor.execute("PRAGMA foreign_keys;")
            fk_was_enabled = cursor.fetchone()[0]
            
            # Disable foreign key constraints
            cursor.execute("PRAGMA foreign_keys = OFF;")
    
    # Perform the deletion
    try:
        username = user.username
        user.delete()
        print(f"\n✅ User '{username}' (ID: {user_id}) successfully deleted.")
        
        # Re-enable foreign keys if we disabled them
        if force:
            with connection.cursor() as cursor:
                cursor.execute(f"PRAGMA foreign_keys = {'ON' if fk_was_enabled else 'OFF'};")
        
        return True
    except Exception as e:
        print(f"\n❌ Error deleting user: {str(e)}")
        
        # Make sure foreign keys are re-enabled
        if force:
            with connection.cursor() as cursor:
                cursor.execute(f"PRAGMA foreign_keys = {'ON' if fk_was_enabled else 'OFF'};")
        
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fix_user_delete.py <user_id> [target_user_id] [--force]")
        sys.exit(1)
    
    user_id = int(sys.argv[1])
    target_user_id = None
    force = False
    
    # Parse additional arguments
    for arg in sys.argv[2:]:
        if arg == '--force':
            force = True
        elif arg.isdigit():
            target_user_id = int(arg)
    
    # Analyze constraints first
    analyze_db_constraints(user_id)
    
    # Ask for confirmation before proceeding
    confirm = input("\nDo you want to proceed with fixing references and deleting the user? (y/n): ")
    if confirm.lower() == 'y':
        delete_user_safely(user_id, target_user_id, force)
    else:
        print("Operation cancelled.") 