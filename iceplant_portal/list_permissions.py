"""
Simple script to list all Django permissions in the database
"""

import os
import sys
import django

# Set up Django environment
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "iceplant_core.settings")
django.setup()

from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

print("Listing all available permissions...")

# Group permissions by app
app_permissions = {}
for permission in Permission.objects.all().order_by('content_type__app_label', 'codename'):
    app_label = permission.content_type.app_label
    if app_label not in app_permissions:
        app_permissions[app_label] = []
    app_permissions[app_label].append(permission)

# Print permissions by app
for app_label in sorted(app_permissions.keys()):
    print(f"\n=== App: {app_label} ===")
    for permission in app_permissions[app_label]:
        print(f"- {permission.codename} ({permission.name})")

# Print content types for inventory app
print("\n=== Content Types for Inventory App ===")
for ct in ContentType.objects.filter(app_label='inventory'):
    print(f"- {ct.model} ({ct.app_label}.{ct.model})")
