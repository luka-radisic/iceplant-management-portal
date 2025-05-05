#!/bin/sh
# This script fixes permission class usage in MaintenanceDashboardView

# Find the maintenance dashboard view class
grep -l 'MaintenanceDashboardView' /app/iceplant_portal/maintenance/views.py

# Create a backup
cp /app/iceplant_portal/maintenance/views.py /app/iceplant_portal/maintenance/views.py.bak

# Fix the permission class usage
sed -i 's/permission_classes = \[HasModulePermission\]/permission_classes = \[HasModulePermission(\"maintenance\")\]/g' /app/iceplant_portal/maintenance/views.py

echo 'Done! Changes made:'
diff /app/iceplant_portal/maintenance/views.py.bak /app/iceplant_portal/maintenance/views.py
