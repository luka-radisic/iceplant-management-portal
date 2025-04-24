#!/usr/bin/env python3
import os
import argparse
import pandas as pd

# Import the database class
from db_interface import AttendanceDatabase

def initialize_database():
    """Initialize database tables"""
    db = AttendanceDatabase()
    print("Database schema initialized successfully.")
    return db

def import_excel_data(db, excel_file):
    """Import data from Excel file into database"""
    if not os.path.exists(excel_file):
        print(f"Error: File {excel_file} not found.")
        return False
        
    try:
        employees_added, records_added = db.import_from_excel(excel_file)
        print(f"Successfully imported data from {excel_file}")
        print(f"- {employees_added} employees added")
        print(f"- {records_added} attendance records added")
        return True
    except Exception as e:
        print(f"Error importing data: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Initialize the attendance database')
    parser.add_argument('--import', dest='import_file', help='Excel file to import', default=None)
    parser.add_argument('--reset', action='store_true', help='Delete existing database before initializing')
    
    args = parser.parse_args()
    
    # Fix: Ensure we're using AttendanceDatabase, not AttendanceDB
    db_path = AttendanceDatabase().db_path
    
    if args.reset:
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
                print(f"Deleted existing database: {db_path}")
            except Exception as e:
                print(f"Error deleting database: {str(e)}")
                return
    
    db = initialize_database()
    
    if args.import_file:
        import_excel_data(db, args.import_file)
    
    # Print stats after import
    employees = db.get_all_employees()
    print(f"\nDatabase contains {len(employees)} employees")
    
    # Get attendance summary
    summary = db.get_attendance_summary()
    print(f"Total attendance records: {summary['total_records']}")
    print(f"Present: {summary['present']}, Absent: {summary['absent']}")
    
    if summary['date_range'][0]:
        print(f"Date range: {summary['date_range'][0]} to {summary['date_range'][1]}")
    
if __name__ == "__main__":
    main()
