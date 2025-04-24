#!/usr/bin/env python3
import os
import sys
import argparse
import logging
from db_interface import AttendanceDatabase, DATABASE_FILE

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def confirm_action(prompt):
    """Ask the user to confirm an action."""
    response = input(f"{prompt} (y/n): ").strip().lower()
    return response == 'y' or response == 'yes'

def display_stats(db):
    """Display database statistics."""
    stats = db.get_attendance_summary()
    employees = db.get_all_employees()
    
    print("\nDatabase Statistics:")
    print(f"- Total employees: {len(employees)}")
    print(f"- Total attendance records: {stats['total_records']}")
    print(f"- Present records: {stats['present']}")
    print(f"- Absent records: {stats['absent']}")
    
    if stats['date_range'][0]:
        print(f"- Date range: {stats['date_range'][0]} to {stats['date_range'][1]}")
    
    if employees:
        print("\nEmployee Sample:")
        for i, emp in enumerate(employees[:5]):  # Show first 5
            print(f"  {i+1}. {emp['name']} (ID: {emp['employee_id']})")
        
        if len(employees) > 5:
            print(f"  ... and {len(employees) - 5} more")

def main():
    parser = argparse.ArgumentParser(description='Attendance Database Manager')
    
    # Main operations
    parser.add_argument('--stats', action='store_true', help='Display database statistics')
    parser.add_argument('--purge', action='store_true', help='Delete ALL data from the database')
    parser.add_argument('--delete-employee', help='Delete an employee and all their records')
    parser.add_argument('--delete-range', action='store_true', help='Delete records within a date range')
    
    # Additional options
    parser.add_argument('--db-path', default=DATABASE_FILE, help='Custom database file path')
    parser.add_argument('--start-date', help='Start date for range operations (YYYY-MM-DD)')
    parser.add_argument('--end-date', help='End date for range operations (YYYY-MM-DD)')
    parser.add_argument('--force', '-f', action='store_true', help='Skip confirmation prompts')
    
    args = parser.parse_args()
    
    # Initialize database connection
    db = AttendanceDatabase(args.db_path)
    
    if args.stats:
        display_stats(db)
        return 0
    
    elif args.purge:
        if args.force or confirm_action("WARNING: This will delete ALL data from the database. Are you sure?"):
            attendance_count, employee_count = db.delete_all_data()
            print(f"Deleted {attendance_count} attendance records and {employee_count} employees")
        else:
            print("Operation cancelled by user")
            
    elif args.delete_employee:
        employee_id = args.delete_employee
        
        # Check if employee exists
        employees = db.search_employees(employee_id)
        if not employees:
            print(f"No employee found with ID {employee_id}")
            return 1
            
        # If multiple matches, ask user to confirm
        if len(employees) > 1:
            print(f"Found {len(employees)} matching employees:")
            for i, emp in enumerate(employees):
                print(f"  {i+1}. {emp['name']} (ID: {emp['employee_id']})")
            
            if not args.force:
                choice = input("Enter the number of the employee to delete (or 'q' to quit): ")
                if choice.lower() == 'q':
                    return 0
                try:
                    choice_idx = int(choice) - 1
                    if choice_idx < 0 or choice_idx >= len(employees):
                        print("Invalid choice")
                        return 1
                    employee_id = employees[choice_idx]['employee_id']
                except ValueError:
                    print("Invalid input")
                    return 1
        
        # Final confirmation
        employee_name = next((e['name'] for e in employees if e['employee_id'] == employee_id), "Unknown")
        if args.force or confirm_action(f"Delete employee {employee_name} (ID: {employee_id}) and all their records?"):
            count, success = db.delete_employee_data(employee_id)
            if success:
                print(f"Successfully deleted employee {employee_name} (ID: {employee_id}) and {count} attendance records")
            else:
                print("Failed to delete employee")
                return 1
        else:
            print("Operation cancelled by user")
    
    elif args.delete_range:
        if not args.start_date and not args.end_date:
            print("Error: You must specify at least one of --start-date or --end-date")
            return 1
        
        # Build deletion description for confirmation
        desc = "Delete attendance records"
        if args.start_date and args.end_date:
            desc += f" from {args.start_date} to {args.end_date}"
        elif args.start_date:
            desc += f" from {args.start_date} onwards"
        else:  # end_date only
            desc += f" until {args.end_date}"
            
        if args.delete_employee:
            desc += f" for employee ID {args.delete_employee}"
        
        if args.force or confirm_action(f"{desc}?"):
            count = db.delete_attendance_range(args.start_date, args.end_date, args.delete_employee)
            print(f"Deleted {count} attendance records")
        else:
            print("Operation cancelled by user")
    
    else:
        # If no operation specified, show stats
        display_stats(db)
        print("\nUse --help to see available commands")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
