#!/usr/bin/env python3
"""
Utility to fill in missing workdays for all employees or specific date ranges.
This script creates "No Work" entries for weekdays and "Weekend" entries for 
weekends that don't have any attendance records.
"""
import os
import sqlite3
import logging
import argparse
from datetime import datetime, timedelta
from dateutil.rrule import rrule, DAILY
from db_interface import AttendanceDatabase, DATABASE_FILE

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fill_missing_workdays(db_path=DATABASE_FILE, employee_id=None, start_date=None, end_date=None):
    """
    Fill missing workdays in the attendance records with 'No Work' status.
    For weekends with no records, add 'Weekend' status.
    
    Args:
        db_path: Path to the database file
        employee_id: Optional employee ID to process specific employee
        start_date: Optional start date for processing
        end_date: Optional end date for processing
        
    Returns:
        dict: Statistics about records added
    """
    conn = None
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        stats = {
            'total_added': 0,
            'no_work_added': 0,
            'weekend_added': 0,
            'employees_processed': 0
        }
        
        # Get all employees or specific employee
        if employee_id:
            cursor.execute("SELECT * FROM employees WHERE employee_id = ?", (employee_id,))
        else:
            cursor.execute("SELECT * FROM employees")
        
        employees = [dict(row) for row in cursor.fetchall()]
        logger.info(f"Processing {len(employees)} employees")
        
        for employee in employees:
            emp_id = employee['employee_id']
            
            # Get date range for this employee
            date_query = """
            SELECT MIN(date) as first_date, MAX(date) as last_date 
            FROM attendance 
            WHERE employee_id = ?
            """
            params = [emp_id]
            
            if start_date:
                date_query += " AND date >= ?"
                params.append(start_date)
                
            if end_date:
                date_query += " AND date <= ?"
                params.append(end_date)
                
            cursor.execute(date_query, params)
            date_range = cursor.fetchone()
            
            if not date_range or not date_range['first_date'] or not date_range['last_date']:
                logger.warning(f"No date range found for employee {emp_id}")
                continue  # Skip if no records found
            
            # Parse dates
            try:
                first_date = datetime.strptime(date_range['first_date'], '%Y-%m-%d')
                last_date = datetime.strptime(date_range['last_date'], '%Y-%m-%d')
            except:
                # Try alternative format
                try:
                    first_date = datetime.strptime(date_range['first_date'], '%Y/%m/%d')
                    last_date = datetime.strptime(date_range['last_date'], '%Y/%m/%d')
                except Exception as e:
                    logger.error(f"Error parsing dates for employee {emp_id}: {str(e)}")
                    continue  # Skip if date parsing fails
            
            # Add some padding to date range (1 week before and after)
            first_date -= timedelta(days=7)
            last_date += timedelta(days=7)
            
            # Override with provided dates if specified
            if start_date:
                try:
                    override_start = datetime.strptime(start_date, '%Y-%m-%d')
                    if override_start > first_date:
                        first_date = override_start
                except:
                    pass
                    
            if end_date:
                try:
                    override_end = datetime.strptime(end_date, '%Y-%m-%d')
                    if override_end < last_date:
                        last_date = override_end
                except:
                    pass
            
            logger.info(f"Processing employee {emp_id} from {first_date.strftime('%Y-%m-%d')} to {last_date.strftime('%Y-%m-%d')}")
            
            # Get existing dates for this employee
            cursor.execute("""
                SELECT date FROM attendance 
                WHERE employee_id = ? AND date >= ? AND date <= ?
            """, (emp_id, first_date.strftime('%Y-%m-%d'), last_date.strftime('%Y-%m-%d')))
            
            existing_dates = set(row['date'] for row in cursor.fetchall())
            
            # Generate all dates in range
            all_dates = []
            for dt in rrule(DAILY, dtstart=first_date, until=last_date):
                all_dates.append(dt.strftime('%Y-%m-%d'))
            
            # Find missing dates
            missing_dates = set(all_dates) - existing_dates
            
            # Insert missing dates with appropriate status
            added_for_employee = 0
            for date_str in missing_dates:
                # Determine if it's a weekend
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                day_of_week = date_obj.strftime('%a.')
                weekday = date_obj.weekday()
                
                if weekday >= 5:  # 5=Saturday, 6=Sunday
                    status = 'Weekend'
                    stats['weekend_added'] += 1
                else:
                    status = 'No Work'
                    stats['no_work_added'] += 1
                
                # Insert record
                cursor.execute("""
                    INSERT INTO attendance 
                    (employee_id, date, day, status, time_in, time_out, actual_time) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (emp_id, date_str, day_of_week, status, '', '', '0'))
                
                stats['total_added'] += 1
                added_for_employee += 1
                
                # Commit every 100 records to avoid transaction timeouts
                if stats['total_added'] % 100 == 0:
                    conn.commit()
            
            logger.info(f"Added {added_for_employee} missing days for employee {emp_id}")
            
            if added_for_employee > 0:
                stats['employees_processed'] += 1
        
        # Final commit
        conn.commit()
        logger.info(f"Added {stats['total_added']} missing workdays ({stats['no_work_added']} No Work, {stats['weekend_added']} Weekend)")
        return stats
        
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error filling missing workdays: {str(e)}")
        raise e
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Fill in missing workdays in the database')
    parser.add_argument('--employee-id', help='Process only this employee ID')
    parser.add_argument('--start-date', help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end-date', help='End date (YYYY-MM-DD)')
    parser.add_argument('--db-path', default=DATABASE_FILE, help='Path to database file')
    
    args = parser.parse_args()
    
    try:
        stats = fill_missing_workdays(
            db_path=args.db_path,
            employee_id=args.employee_id,
            start_date=args.start_date,
            end_date=args.end_date
        )
        
        print(f"Successfully processed {stats['employees_processed']} employees")
        print(f"Added {stats['total_added']} missing workdays:")
        print(f"  • {stats['no_work_added']} No Work (weekdays)")
        print(f"  • {stats['weekend_added']} Weekend (weekends)")
    except Exception as e:
        print(f"Error: {str(e)}")
