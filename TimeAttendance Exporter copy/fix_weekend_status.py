#!/usr/bin/env python3
import sqlite3
import logging
from datetime import datetime
from db_interface import DATABASE_FILE

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fix_weekend_status(db_path=DATABASE_FILE):
    """Fix any Saturdays incorrectly marked as Weekend."""
    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all records marked as "Weekend"
        cursor.execute("SELECT id, date, time_in, time_out FROM attendance WHERE status = 'Weekend'")
        weekend_records = cursor.fetchall()
        
        corrected = 0
        for record_id, date_str, time_in, time_out in weekend_records:
            try:
                # Check if it's a Saturday
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                if date_obj.weekday() == 5:  # Saturday (5)
                    # Determine correct status
                    if not time_in or time_in == '0:00' or not time_out or time_out == '0:00':
                        new_status = 'No Work'
                    else:
                        new_status = 'Present'
                    
                    # Update the record
                    cursor.execute(
                        "UPDATE attendance SET status = ? WHERE id = ?", 
                        (new_status, record_id)
                    )
                    corrected += cursor.rowcount
            except Exception as e:
                logger.error(f"Error processing record {record_id}, date {date_str}: {e}")
                
        conn.commit()
        logger.info(f"Corrected {corrected} Saturday records incorrectly marked as Weekend")
        return corrected
        
    except sqlite3.Error as e:
        logger.error(f"Database error: {str(e)}")
        return 0
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("Fixing weekend status for incorrect Saturday records...")
    count = fix_weekend_status()
    print(f"Fixed {count} records. Saturday is no longer marked as Weekend (only Sunday is).")
