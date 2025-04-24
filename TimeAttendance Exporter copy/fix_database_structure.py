#!/usr/bin/env python3
"""
Utility to fix and upgrade database structure.
"""
import os
import logging
import sqlite3
import argparse
from db_interface import AttendanceDatabase, DATABASE_FILE

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def backup_database(db_path=DATABASE_FILE):
    """Create a backup of the database before modifying it."""
    try:
        import shutil
        from datetime import datetime
        
        # Create backups directory if not exists
        backup_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        # Generate backup filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"pre_migration_backup_{timestamp}.db"
        backup_path = os.path.join(backup_dir, backup_name)
        
        # Copy database file if it exists
        if os.path.exists(db_path):
            shutil.copy2(db_path, backup_path)
            logger.info(f"Database backup created: {backup_path}")
            return True
        else:
            logger.warning(f"Database file not found at {db_path}. No backup created.")
            return False
    except Exception as e:
        logger.error(f"Error creating backup: {str(e)}")
        return False

def add_missing_columns(db_path=DATABASE_FILE):
    """Add missing columns to the database tables."""
    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check employees table
        cursor.execute("PRAGMA table_info(employees)")
        employee_columns = {col[1] for col in cursor.fetchall()}
        
        # Add department column if missing
        if 'department' not in employee_columns:
            logger.info("Adding department column to employees table")
            cursor.execute("ALTER TABLE employees ADD COLUMN department TEXT")
        
        # Check attendance table
        cursor.execute("PRAGMA table_info(attendance)")
        attendance_columns = {col[1] for col in cursor.fetchall()}
        
        # Add standard columns to attendance if missing
        standard_columns = {
            'employee_id': 'TEXT', 
            'date': 'TEXT',
            'day': 'TEXT',
            'status': 'TEXT',
            'time_in': 'TEXT',
            'time_out': 'TEXT',
            'actual_time': 'TEXT',
            'required_time': 'TEXT',
            'company': 'TEXT',
            'report_period': 'TEXT',
            'source': 'TEXT'
        }
        
        for col, type in standard_columns.items():
            if col not in attendance_columns:
                logger.info(f"Adding missing column {col} to attendance table")
                cursor.execute(f"ALTER TABLE attendance ADD COLUMN {col} {type}")
        
        # Update statuses: Change "Absent" to "No Work" if needed
        cursor.execute("UPDATE attendance SET status = 'No Work' WHERE status = 'Absent'")
        absent_count = cursor.rowcount
        if absent_count > 0:
            logger.info(f"Updated {absent_count} records from 'Absent' to 'No Work'")
            
        # Commit changes
        conn.commit()
        logger.info("Database structure fixed successfully")
        return True
        
    except sqlite3.Error as e:
        logger.error(f"Error fixing database structure: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def validate_database():
    """Validate database consistency."""
    db = AttendanceDatabase()
    issues = []
    
    # Check for employees without department
    conn = None
    try:
        conn = sqlite3.connect(db.db_path)
        cursor = conn.cursor()
        
        # Check for employees with no department
        cursor.execute("""
            SELECT COUNT(*) FROM employees 
            WHERE department IS NULL OR department = ''
        """)
        no_dept_count = cursor.fetchone()[0]
        if no_dept_count > 0:
            issues.append(f"Found {no_dept_count} employees without department")
        
        # Check for inconsistent status values
        cursor.execute("""
            SELECT DISTINCT status FROM attendance
            WHERE status NOT IN ('Present', 'No Work', 'Weekend', 'Weekend Work', 'Incomplete', 'Late Work', 'Early Departure')
        """)
        invalid_statuses = [row[0] for row in cursor.fetchall()]
        if invalid_statuses:
            issues.append(f"Found invalid status values: {', '.join(invalid_statuses)}")
            
        # Report issues
        if issues:
            logger.warning("Database validation issues:")
            for issue in issues:
                logger.warning(f" - {issue}")
        else:
            logger.info("Database validation successful - no issues found")
            
        return len(issues) == 0
        
    except sqlite3.Error as e:
        logger.error(f"Error validating database: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description='Fix database structure')
    parser.add_argument('--no-backup', action='store_true', help='Skip database backup')
    parser.add_argument('--validate-only', action='store_true', help='Only validate database without changes')
    parser.add_argument('--db-path', help='Path to database file')
    
    args = parser.parse_args()
    db_path = args.db_path if args.db_path else DATABASE_FILE
    
    # Just validate if requested
    if args.validate_only:
        validate_database()
        return
    
    # Backup the database first
    if not args.no_backup:
        backup_database(db_path)
    
    # Fix structure
    success = add_missing_columns(db_path)
    
    # Validate after changes
    if success:
        validate_database()
        
if __name__ == "__main__":
    main()
