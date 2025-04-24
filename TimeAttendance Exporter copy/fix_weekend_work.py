#!/usr/bin/env python3
import sqlite3
import logging
from db_interface import DATABASE_FILE

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fix_weekend_work(db_path=DATABASE_FILE):
    """Update Sunday records with time in/out to 'Weekend Work' status."""
    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all Weekend records with time in/out values
        cursor.execute("""
            SELECT id, date, time_in, time_out 
            FROM attendance 
            WHERE status = 'Weekend'
            AND time_in IS NOT NULL AND time_in != '0:00' AND time_in != 'nan'
            AND time_out IS NOT NULL AND time_out != '0:00' AND time_out != 'nan'
        """)
        sunday_work_records = cursor.fetchall()
        
        updated = 0
        for record_id, date_str, time_in, time_out in sunday_work_records:
            # Update to new status
            cursor.execute(
                "UPDATE attendance SET status = 'Weekend Work' WHERE id = ?", 
                (record_id,)
            )
            updated += cursor.rowcount
                
        conn.commit()
        logger.info(f"Updated {updated} Sunday records to 'Weekend Work' status")
        return updated
        
    except sqlite3.Error as e:
        logger.error(f"Database error: {str(e)}")
        return 0
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("Updating Sunday records with work hours to 'Weekend Work' status...")
    count = fix_weekend_work()
    print(f"Updated {count} records. Sundays with work hours are now labeled 'Weekend Work'.")
