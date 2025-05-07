#!/bin/bash
# Script to fix HR Payrol permissions
echo "Fixing HR Payrol permissions..."

# Run SQL commands if using direct DB access
# cat fix_hr_payrol_permissions.sql | python manage.py dbshell

# Run integration script (preferred method)
python manage.py shell < integrate_hr_payrol_permissions.py

echo "HR Payrol permissions fixed!"
