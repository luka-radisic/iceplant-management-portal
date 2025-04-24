import os
import sqlite3
import logging
import pandas as pd
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Path to the SQLite database file
DATABASE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "attendance.db")

class AttendanceDatabase:
    """Database interface for attendance records."""
    
    def __init__(self, db_path=DATABASE_FILE):
        """Initialize the database connection."""
        # Handle None safely by using default
        self.db_path = db_path if db_path is not None else DATABASE_FILE
        self._ensure_db_exists()
    
    def _ensure_db_exists(self):
        """Create the database and tables if they don't exist."""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create employees table
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT,
                name TEXT,
                department TEXT,
                UNIQUE(employee_id)
            )
            ''')
            
            # Check if department column exists in employees table, add it if it doesn't
            cursor.execute("PRAGMA table_info(employees)")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]
            
            if 'department' not in column_names:
                logger.info("Adding department column to employees table")
                cursor.execute("ALTER TABLE employees ADD COLUMN department TEXT")
            
            # Create attendance table with all required columns
            cursor.execute('''
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
            ''')
            
            conn.commit()
            logger.info("Database schema initialized")
        except sqlite3.Error as e:
            logger.error(f"Database error: {str(e)}")
        finally:
            if conn:
                conn.close()
    
    def insert_employee(self, employee_id, name):
        """Add or update an employee in the database."""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO employees (employee_id, name) VALUES (?, ?)",
                (employee_id, name)
            )
            conn.commit()
            return cursor.lastrowid
        except sqlite3.Error as e:
            logger.error(f"Error inserting employee: {str(e)}")
            return None
        finally:
            if conn:
                conn.close()
    
    def insert_attendance(self, employee_id, date, day, status, time_in, time_out, actual_time):
        """Add an attendance record for an employee."""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if Sunday and update status accordingly
            try:
                date_obj = datetime.strptime(date, '%Y-%m-%d')
                is_sunday = date_obj.weekday() == 6  # Sunday is 6
                
                if is_sunday:
                    # If they came to work on Sunday (has time_in and time_out)
                    if (time_in and time_in != '0:00' and time_out and time_out != '0:00'):
                        status = 'Weekend Work'  # Special status for Sunday work
                    else:
                        status = 'Weekend'  # Regular weekend status (no work)
                elif date_obj.weekday() == 5 and status == 'Weekend':  # Fix incorrect Saturday weekend marking
                    status = 'No Work' if (not time_in or time_in == '0:00') else 'Present'
            except:
                pass
            
            # Mark as No Work if no time in/out on a work day
            if (not time_in or time_in == '0:00') and (not time_out or time_out == '0:00'):
                if status != 'Weekend' and status != 'Weekend Work':
                    status = 'No Work'  # Changed from 'Non Working'
            
            cursor.execute(
                """
                INSERT INTO attendance 
                (employee_id, date, day, status, time_in, time_out, actual_time)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (employee_id, date, day, status, time_in, time_out, actual_time)
            )
            conn.commit()
            return cursor.lastrowid
        except sqlite3.Error as e:
            logger.error(f"Error inserting attendance: {str(e)}")
            return None
        finally:
            if conn:
                conn.close()
    
    def search_employees(self, search_term=None, department=None):
        """
        Search for employees by ID, name, or department.
        If search_term is None, return all employees.
        
        Args:
            search_term: Search by name or ID
            department: Filter by department
        """
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            where_clauses = []
            params = []
            
            if search_term:
                where_clauses.append("(employee_id LIKE ? OR name LIKE ?)")
                params.extend([f'%{search_term}%', f'%{search_term}%'])
                
            if department:
                where_clauses.append("department = ?")
                params.append(department)
            
            query = "SELECT * FROM employees"
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
            
            query += " ORDER BY name"
            
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
        except sqlite3.Error as e:
            logger.error(f"Database error during search: {str(e)}")
            return []
        finally:
            if conn:
                conn.close()
    
    def get_departments(self):
        """Get a list of all departments in the database."""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT DISTINCT department FROM employees 
                WHERE department IS NOT NULL AND department != ''
                ORDER BY department
            """)
            return [row[0] for row in cursor.fetchall()]
        except sqlite3.Error as e:
            logger.error(f"Error getting departments: {str(e)}")
            return []
        finally:
            if conn:
                conn.close()
    
    def get_all_employees(self):
        """Get all employees in the database."""
        return self.search_employees()
    
    def get_attendance_records(self, employee_id=None, name=None, start_date=None, end_date=None, department=None, limit=500):
        """
        Get attendance records matching the specified filters.
        
        Args:
            employee_id: Filter by employee ID
            name: Filter by employee name
            start_date: Filter by start date (inclusive)
            end_date: Filter by end date (inclusive)
            department: Filter by department
            limit: Maximum number of records to return
        
        Returns:
            List of attendance records
        """
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = """
            SELECT a.*, e.name as employee_name, e.department as department
            FROM attendance a
            JOIN employees e ON a.employee_id = e.employee_id
            WHERE 1=1
            """
            params = []
            
            # Add filters
            if employee_id:
                query += " AND a.employee_id = ?"
                params.append(employee_id)
            if name:
                query += " AND e.name LIKE ?"
                params.append(f'%{name}%')
            if department:
                query += " AND e.department = ?"
                params.append(department)
            if start_date:
                query += " AND a.date >= ?"
                params.append(start_date)
            if end_date:
                query += " AND a.date <= ?"
                params.append(end_date)
            
            # Add order and limit
            query += " ORDER BY a.date DESC, e.name LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
        except sqlite3.Error as e:
            logger.error(f"Error getting attendance records: {str(e)}")
            return []
        finally:
            if conn:
                conn.close()
    
    def get_attendance_summary(self, employee_id=None, start_date=None, end_date=None):
        """Get summary statistics for attendance records."""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Base query
            query = "SELECT status, COUNT(*) as count FROM attendance"
            where_clauses = []
            params = []
            
            # Add filters if provided
            if employee_id:
                where_clauses.append("employee_id = ?")
                params.append(employee_id)
            if start_date:
                where_clauses.append("date >= ?")
                params.append(start_date)
            if end_date:
                where_clauses.append("date <= ?")
                params.append(end_date)
            
            # Add WHERE clause if needed
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
            
            # Group by status
            query += " GROUP BY status"
            
            # Execute query
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            # Organize results
            summary = {
                'total_records': 0,
                'present': 0,
                'weekend': 0,
                'weekend_work': 0,
                'no_work': 0,
                'incomplete': 0,  # New status for incomplete records
                'late_work': 0,     # New status for late arrival
                'early_departure': 0,  # New status for early departure
                'date_range': (None, None)
            }
            
            # Count by status
            for status, count in rows:
                summary['total_records'] += count
                status_lower = status.lower()
                
                if status_lower == 'present':
                    summary['present'] += count 
                elif status_lower == 'absent':
                    # Add any "Absent" records to "No Work" instead
                    summary['no_work'] += count
                elif status_lower == 'weekend':
                    summary['weekend'] += count
                elif status_lower == 'weekend work':
                    summary['weekend_work'] += count
                elif status_lower == 'no work':
                    summary['no_work'] += count
                elif status_lower == 'incomplete':
                    summary['incomplete'] += count
                elif status_lower == 'late work':
                    summary['late_work'] += count
                elif status_lower == 'early departure':
                    summary['early_departure'] += count
            
            # Get date range
            if summary['total_records'] > 0:
                cursor.execute("SELECT MIN(date), MAX(date) FROM attendance")
                min_date, max_date = cursor.fetchone()
                summary['date_range'] = (min_date, max_date)
            
            return summary
        except sqlite3.Error as e:
            logger.error(f"Error getting attendance summary: {str(e)}")
            return summary
        finally:
            if conn:
                conn.close()
    
    def import_from_excel(self, excel_path):
        """
        Import attendance data from an Excel file.
        
        Returns:
            Tuple of (employees_added, records_added)
        """
        employees_added = 0
        records_added = 0
        try:
            # Read Excel file
            df = pd.read_excel(excel_path)
            
            # Check required columns
            required_columns = ['Employee Name', 'Employee ID', 'Date', 'Status']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                logger.error(f"Missing required columns in Excel: {missing_columns}")
                return 0, 0
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Process employees
                employees = df[['Employee ID', 'Employee Name']].drop_duplicates()
                for _, row in employees.iterrows():
                    employee_id = str(row['Employee ID'])
                    name = row['Employee Name']
                    cursor.execute(
                        "INSERT OR IGNORE INTO employees (employee_id, name) VALUES (?, ?)",
                        (employee_id, name)
                    )
                    if cursor.rowcount > 0:
                        employees_added += 1
                
                # Process attendance records
                for _, row in df.iterrows():
                    employee_id = str(row['Employee ID'])
                    
                    # Format date if it's a datetime
                    date = row['Date']
                    if isinstance(date, pd.Timestamp):
                        date = date.strftime('%Y-%m-%d')
                    
                    # Get day of week
                    day = row.get('Day', '')
                    if not day and date:
                        try:
                            date_obj = datetime.strptime(date, '%Y-%m-%d')
                            weekday = date_obj.weekday()
                            day_names = ['Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.', 'Sun.']
                            day = day_names[weekday]
                        except:
                            day = ''
                    
                    # Get status and times
                    status = row.get('Status', 'Unknown')
                    
                    # Explicitly fix Saturday/Sunday status - force correct Weekend designation
                    try:
                        date_obj = datetime.strptime(date, '%Y-%m-%d')
                        weekday = date_obj.weekday()
                        if weekday == 6:  # Sunday is Weekend (6)
                            status = 'Weekend'
                        elif weekday == 5 and status == 'Weekend':  # Saturday (5) is NOT Weekend
                            # If Saturday was incorrectly marked as Weekend in source data
                            if (time_in == '0:00' or time_in == 'nan' or time_in == '') and \
                               (time_out == '0:00' or time_out == 'nan' or time_out == ''):
                                status = 'No Work'  # Use No Work for Saturdays with no hours
                            else:
                                status = 'Present'  # Default to Present for Saturdays with hours
                    except:
                        pass
                    
                    time_in = str(row.get('Time In', '0:00'))
                    time_out = str(row.get('Time Out', '0:00'))
                    actual_time = row.get('Actual Time', '')
                    
                    # Check if Sunday    
                    try:
                        date_obj = datetime.strptime(date, '%Y-%m-%d')
                        if date_obj.weekday() == 6:  # Sunday
                            status = 'Weekend'
                            if (time_in and time_in != '0:00' and time_in != 'nan' and 
                                time_out and time_out != '0:00' and time_out != 'nan'):
                                status = 'Weekend Work'  # Special status for Sunday work
                    except:
                        pass
                    
                    # Check if No Work day
                    if (time_in == '0:00' or time_in == 'nan' or time_in == '') and \
                       (time_out == '0:00' or time_out == 'nan' or time_out == ''):
                        if status != 'Weekend':
                            status = 'No Work'  # Changed from 'Non Working'
                    
                    # Replace "Absent" with "No Work"
                    if status.lower() == 'absent':
                        status = 'No Work'
                    
                    # Insert record
                    cursor.execute(
                        """
                        INSERT INTO attendance 
                        (employee_id, date, day, status, time_in, time_out, actual_time)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (employee_id, date, day, status, time_in, time_out, actual_time)
                    )
                    if cursor.rowcount > 0:
                        records_added += 1
                
                conn.commit()
            return employees_added, records_added
        except Exception as e:
            logger.error(f"Error importing Excel data: {str(e)}")
            return 0, 0
    
    def delete_all_data(self):
        """Delete all data from the database."""
        conn = None
        attendance_count = 0
        employee_count = 0
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Delete attendance records
            cursor.execute("DELETE FROM attendance")
            attendance_count = cursor.rowcount
            
            # Delete employees
            cursor.execute("DELETE FROM employees")
            employee_count = cursor.rowcount
            
            conn.commit()
            logger.info(f"Deleted {attendance_count} attendance records and {employee_count} employees")
            return attendance_count, employee_count
        except sqlite3.Error as e:
            logger.error(f"Error deleting data: {str(e)}")
            return 0, 0
        finally:
            if conn:
                conn.close()
    
    def delete_employee_data(self, employee_id):
        """
        Delete an employee and all their attendance records.
        
        Args:
            employee_id: The employee ID to delete
        
        Returns:    
            Tuple of (records_deleted, success)
        """
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            conn.execute("PRAGMA foreign_keys = ON")  # Enable foreign key constraints
            cursor = conn.cursor()
            
            # First delete attendance records
            cursor.execute("DELETE FROM attendance WHERE employee_id = ?", (employee_id,))
            records_deleted = cursor.rowcount
            
            # Then delete the employee
            cursor.execute("DELETE FROM employees WHERE employee_id = ?", (employee_id,))
            employee_deleted = cursor.rowcount > 0
            
            conn.commit()
            if employee_deleted:
                logger.info(f"Deleted employee {employee_id} and {records_deleted} attendance records")
                return records_deleted, True
            else:
                logger.warning(f"Employee {employee_id} not found")
                return 0, False
        except sqlite3.Error as e:
            logger.error(f"Error deleting employee {employee_id}: {str(e)}")
            if conn:
                conn.rollback()
            return 0, False
        finally:
            if conn:
                conn.close()
    
    def delete_attendance_range(self, start_date=None, end_date=None, employee_id=None):
        """
        Delete attendance records in a specified date range.
        
        Args:
            start_date: Start date (inclusive) in YYYY-MM-DD format, or None for all dates up to end_date
            end_date: End date (inclusive) in YYYY-MM-DD format, or None for all dates from start_date
            employee_id: Optional employee ID to limit deletion to a specific employee
        
        Returns:
            Number of records deleted
        """
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Build the query and parameters
            query = "DELETE FROM attendance WHERE 1=1"
            params = []
            
            if start_date:
                query += " AND date >= ?"
                params.append(start_date)
                
            if end_date:
                query += " AND date <= ?"
                params.append(end_date)
                
            if employee_id:
                query += " AND employee_id = ?"
                params.append(employee_id)
            
            # Execute the delete operation
            cursor.execute(query, params)
            deleted_count = cursor.rowcount
            
            conn.commit()
            logger.info(f"Deleted {deleted_count} attendance records")
            return deleted_count
            
        except sqlite3.Error as e:
            logger.error(f"Error deleting attendance records: {str(e)}")
            if conn:
                conn.rollback()
            return 0
        finally:
            if conn:
                conn.close()

# For backwards compatibility
def import_excel_to_db(excel_path, db_path=None):
    """Import an Excel file into the database."""
    db = AttendanceDatabase(db_path)
    return db.import_from_excel(excel_path)
