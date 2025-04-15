#!/usr/bin/env python
"""
Script to add test employee data to the IcePlant database.
This will create sample employees with various departments to test the
department filtering and employee search functionality.
"""

import os
import sys
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iceplant_core.settings')
django.setup()

from attendance.models import EmployeeProfile
from django.contrib.auth.models import User
from django.utils import timezone

# The default departments used in the system
DEPARTMENTS = ['Driver', 'Office', 'Harvester', 'Operator', 'Sales', 'Admin', 'HR']

# Sample employee data to create
TEST_EMPLOYEES = [
    {
        'employee_id': 'EMP001',
        'full_name': 'John Smith',
        'department': 'Admin',
        'position': 'Manager',
    },
    {
        'employee_id': 'EMP002',
        'full_name': 'Jane Doe',
        'department': 'HR',
        'position': 'HR Specialist',
    },
    {
        'employee_id': 'EMP003',
        'full_name': 'Jackie Chan',
        'department': 'Driver',
        'position': 'Senior Driver',
    },
    {
        'employee_id': 'EMP004',
        'full_name': 'Michael Johnson',
        'department': 'Harvester',
        'position': 'Team Lead',
    },
    {
        'employee_id': 'EMP005',
        'full_name': 'Sarah Williams',
        'department': 'Office',
        'position': 'Administrative Assistant',
    },
    {
        'employee_id': 'EMP006',
        'full_name': 'Robert Brown',
        'department': 'Operator',
        'position': 'Machine Operator',
    },
    {
        'employee_id': 'EMP007',
        'full_name': 'Emily Davis',
        'department': 'Sales',
        'position': 'Sales Representative',
    },
    {
        'employee_id': 'EMP008',
        'full_name': 'David Wilson',
        'department': 'Admin',
        'position': 'Assistant Manager',
    },
    {
        'employee_id': 'EMP009',
        'full_name': 'Lisa Martinez',
        'department': 'HR',
        'position': 'Recruiter',
    },
    {
        'employee_id': 'EMP010',
        'full_name': 'Jack Anderson',
        'department': 'Driver',
        'position': 'Junior Driver',
    },
]

def main():
    # Check if there are already employees in the database
    existing_count = EmployeeProfile.objects.count()
    
    if existing_count > 0:
        print(f"There are already {existing_count} employees in the database.")
        overwrite = input("Do you want to continue and add more test employees? (y/n): ")
        if overwrite.lower() != 'y':
            print("Exiting without making changes.")
            return
    
    # Track how many employees were created
    created_count = 0
    
    # Create test employees
    for emp_data in TEST_EMPLOYEES:
        # Check if employee with this ID already exists
        if EmployeeProfile.objects.filter(employee_id=emp_data['employee_id']).exists():
            print(f"Employee ID {emp_data['employee_id']} already exists, skipping...")
            continue
            
        # Create the employee profile
        try:
            EmployeeProfile.objects.create(
                employee_id=emp_data['employee_id'],
                full_name=emp_data['full_name'],
                department=emp_data['department'],
                position=emp_data['position'],
                is_active=True,
                date_created=timezone.now()
            )
            created_count += 1
            print(f"Created {emp_data['full_name']} in {emp_data['department']} department")
        except Exception as e:
            print(f"Error creating employee {emp_data['full_name']}: {str(e)}")
    
    print(f"\nSuccessfully created {created_count} test employees.")
    print(f"Total employees in database: {EmployeeProfile.objects.count()}")
    print(f"Active employees in database: {EmployeeProfile.objects.filter(is_active=True).count()}")
    
    # Print all departments in the system now
    departments = EmployeeProfile.objects.values_list('department', flat=True).distinct()
    print(f"\nDepartments in system: {', '.join(departments)}")

if __name__ == "__main__":
    main()
