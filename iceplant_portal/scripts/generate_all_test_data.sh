#!/bin/bash

echo "Generating Users..."
python iceplant_portal/manage.py generate_users --reset

# Skipping Employees generation (deprecated)

echo "Generating Buyers..."
python iceplant_portal/manage.py generate_buyers --reset --volume=50

echo "Generating Inventory..."
python iceplant_portal/manage.py generate_inventory --reset --volume=20

echo "Generating Sales..."
python iceplant_portal/manage.py generate_sales --reset --volume=200

echo "Generating Expenses..."
python iceplant_portal/manage.py generate_expenses --reset --volume=200

echo "Generating Maintenance..."
python iceplant_portal/manage.py generate_maintenance --reset --volume=100

echo "All test data generated successfully."