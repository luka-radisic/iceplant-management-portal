#!/bin/bash
# This script generates all test data for the Iceplant Portal application.
# It resets the database and generates data for Users, Buyers, Inventory,
# Employees, Expenses, Maintenance, and Sales in a specific order.
# Ensure the script is executable
# and run it from the command line.
# Usage: ./generate_all_test_data.sh

echo "Resetting and generating Inventory..."
python manage.py generate_inventory --reset --volume=30

echo "Resetting and generating Employees..."
python manage.py generate_employees --reset --volume=5

echo "Resetting and generating Expenses..."
python manage.py generate_expenses --reset --volume=200

echo "Resetting and generating Maintenance..."
python manage.py generate_maintenance --reset --volume=100

echo "Resetting and generating Sales..."
python manage.py generate_sales --reset --volume=200

echo "All test data generated successfully following unified protocol order."