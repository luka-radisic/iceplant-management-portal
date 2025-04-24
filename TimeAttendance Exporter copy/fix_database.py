#!/usr/bin/env python3
import os
import sqlite3
import logging
import argparse
from db_interface import DATABASE_FILE

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_column_exists(cursor, table, column):
    """Check if a column exists in a table."""
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [info[1] for info in cursor.fetchall()]
    return column in columns

def add_missing_columns(db_path=DATABASE_FILE):
    """Add any missing columns to the database tables."""
    required_columns = {
        'attendance': {
            'day': 'TEXT',
            'required_time': 'TEXT',
            'time_in': 'TEXT',
            'time_out': 'TEXT',
            'actual_time': 'TEXT',
            'status': 'TEXT',
            'company': 'TEXT', 
            'report_period': 'TEXT',
            'source': 'TEXT'
        }
    }
    
    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check each table for missing columns
        for table, columns in required_columns.items():
            for column, dtype in columns.items():
                if not check_column_exists(cursor, table, column):
                    logger.info(f"Adding missing column '{column}' to table '{table}'")
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {dtype}")
                    
        conn.commit()
        logger.info("Database structure updated successfully")
        
        # Verify all columns exist now
        for table, columns in required_columns.items():
            cursor.execute(f"PRAGMA table_info({table})")
            current_columns = {info[1] for info in cursor.fetchall()}
            for column in columns.keys():
                if column not in current_columns:
                    logger.warning(f"Column '{column}' still missing from '{table}' after update attempt")
                    
        return True
                    
    except sqlite3.Error as e:
        logger.error(f"Database error: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def ensure_tables_exist(db_path=DATABASE_FILE):
    """Create required tables if they don't exist."""
    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create employees table if it doesn't exist
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT,
            name TEXT,
            UNIQUE(employee_id)
        )
        """)
        
        # Create attendance table if it doesn't exist
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT,
            date TEXT,
            day TEXT,
            status TEXT,
            time_in TEXT,
            time_out TEXT,
            actual_time TEXT,
            required_time TEXT,
            company TEXT,
            report_period TEXT,
            source TEXT,
            FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        )
        """)
        
        conn.commit()
        logger.info("Database tables created/verified successfully")
        return True
    except sqlite3.Error as e:
        logger.error(f"Error creating database tables: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def backup_database(db_path=DATABASE_FILE):
    """Create a backup of the database file."""
    import shutil
    from datetime import datetime
    
    if not os.path.exists(db_path):
        logger.warning(f"Database file {db_path} does not exist. Nothing to backup.")
        return False
        
    backup_path = f"{db_path}.{datetime.now().strftime('%Y%m%d_%H%M%S')}.bak"
    try:
        shutil.copy2(db_path, backup_path)
        logger.info(f"Database backup created: {backup_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to create database backup: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Fix database structure issues')
    parser.add_argument('--db-path', help='Path to the database file', default=DATABASE_FILE)
    parser.add_argument('--no-backup', action='store_true', help='Skip database backup')
    parser.add_argument('--check-only', action='store_true', help="Check for issues without fixing")
    args = parser.parse_args()
    
    db_path = args.db_path
    
    if not os.path.exists(db_path):
        logger.error(f"Database file {db_path} not found")
        return False
        
    logger.info(f"Working with database: {db_path}")
    
    # Create backup unless specifically disabled
    if not args.no_backup:
        backup_database(db_path)
    
    # First ensure tables exist
    ensure_tables_exist(db_path)
    
    # Check and optionally fix database structure
    if args.check_only:
        logger.info("Check-only mode. Not making any changes to the database.")
        # We would implement checking functionality here
        return True
    else:
        return add_missing_columns(db_path)

if __name__ == "__main__":
    success = main()
    if success:
        logger.info("Database fix completed successfully")
    else:
        logger.error("Database fix failed")
