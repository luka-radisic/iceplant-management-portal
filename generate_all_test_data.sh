#!/bin/bash

# Change to the directory where this script is located
cd "$(dirname "$0")"

# Change to project root (parent directory)
cd .

echo "Resetting and generating Users..."
python iceplant_portal/manage.py generate_users --reset

echo "Resetting and generating Buyers..."
python iceplant_portal/manage.py generate_buyers --reset --volume=50

echo "Resetting and generating Inventory..."
python iceplant_portal/manage.py generate_inventory --reset --volume=20

echo "Resetting and generating Employees..."
python iceplant_portal/manage.py generate_employees --reset --volume=50

echo "Resetting and generating Expenses..."
python iceplant_portal/manage.py generate_expenses --reset --volume=200

echo "Resetting and generating Maintenance..."
python iceplant_portal/manage.py generate_maintenance --reset --volume=100

echo "Resetting and generating Sales..."
python iceplant_portal/manage.py generate_sales --reset --volume=200

echo "All test data generated successfully following unified protocol order."