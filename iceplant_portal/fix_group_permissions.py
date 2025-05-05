"""
Script to fix the permission_classes configuration in api_views_groups.py
"""

# The issue:
# Django REST Framework expects permission_classes to be a list of classes,
# which it then instantiates. Our code is providing instances (IsInGroups(['Admins'])) 
# instead of classes, causing "object is not callable" errors.

# Create a backup of the original file
import os
import shutil

# Path to the file that needs fixing
file_path = '/app/iceplant_portal/users/api_views_groups.py'
backup_path = file_path + '.bak'

# Create backup
shutil.copy2(file_path, backup_path)
print(f"Created backup at {backup_path}")

# Read the file content
with open(file_path, 'r') as file:
    content = file.read()

# Make modifications
# 1. Add custom permission class that doesn't require arguments
modified_content = content.replace(
    "from iceplant_core.group_permissions import IsInGroups",
    """from iceplant_core.group_permissions import IsInGroups

# Define custom permission class for Admins group
class IsAdmin(IsInGroups):
    def __init__(self):
        super().__init__(groups=['Admins'])"""
)

# 2. Replace the permission_classes in both ViewSets
modified_content = modified_content.replace(
    "permission_classes = [IsAuthenticated, IsInGroups(['Admins'])]",
    "permission_classes = [IsAuthenticated, IsAdmin]"
)

# Write the modified content back to the file
with open(file_path, 'w') as file:
    file.write(modified_content)

print("Updated permission classes in api_views_groups.py")
print("Restart the backend server for changes to take effect")
