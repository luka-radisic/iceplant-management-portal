#!/usr/bin/env python3
import sqlite3
import pandas as pd
from datetime import datetime
from db_interface import DATABASE_FILE

def get_weekend_work_records(db_path=DATABASE_FILE):
    """Extract all weekend work records from the database."""
    conn = None
    try:
        conn = sqlite3.connect(db_path)
        
        # Query to find all Weekend Work records
        query = """
        SELECT e.name, a.employee_id, a.date, a.day, a.time_in, a.time_out, a.status
        FROM attendance a
        JOIN employees e ON a.employee_id = e.employee_id
        WHERE (a.status = 'Weekend Work') OR 
              (STRFTIME('%w', a.date) = '0' AND a.time_in != '0:00' AND a.time_out != '0:00')
        ORDER BY a.date DESC, e.name
        """
        
        # Load results into DataFrame
        df = pd.read_sql_query(query, conn)
        
        # Also look for potential weekend work that's not properly labeled
        missed_query = """
        SELECT e.name, a.employee_id, a.date, a.day, a.time_in, a.time_out, a.status
        FROM attendance a
        JOIN employees e ON a.employee_id = e.employee_id
        WHERE STRFTIME('%w', a.date) = '0' 
          AND a.status = 'Weekend'
          AND a.time_in IS NOT NULL 
          AND a.time_in != '0:00'
          AND a.time_out IS NOT NULL
          AND a.time_out != '0:00'
        ORDER BY a.date DESC, e.name
        """
        missed_df = pd.read_sql_query(missed_query, conn)
        
        return df, missed_df
    
    except Exception as e:
        print(f"Error retrieving weekend work records: {e}")
        return pd.DataFrame(), pd.DataFrame()
    finally:
        if conn:
            conn.close()

def update_missed_weekend_work(db_path=DATABASE_FILE):
    """Update any Sunday records with time entries to Weekend Work status."""
    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        query = """
        UPDATE attendance 
        SET status = 'Weekend Work'
        WHERE STRFTIME('%w', date) = '0'  -- Sunday is 0 in SQLite STRFTIME
          AND status = 'Weekend'
          AND time_in IS NOT NULL 
          AND time_in != '0:00'
          AND time_out IS NOT NULL
          AND time_out != '0:00'
        """
        cursor.execute(query)
        updated = cursor.rowcount
        conn.commit()
        
        return updated
    
    except Exception as e:
        print(f"Error updating weekend work status: {e}")
        return 0
    finally:
        if conn:
            conn.close()

def main():
    print("Weekend Work Analysis Tool")
    print("=========================\n")
    
    # First update any missed weekend work records
    updated = update_missed_weekend_work()
    if updated:
        print(f"Updated {updated} records to 'Weekend Work' status\n")
    
    # Get all weekend work records
    weekend_work_df, missed_df = get_weekend_work_records()
    
    # Display results
    if len(weekend_work_df) > 0:
        print(f"Found {len(weekend_work_df)} Weekend Work records:")
        print(weekend_work_df)
        
        # Export to Excel if requested
        export = input("\nExport to Excel? (y/n): ").lower().strip()
        if export == 'y':
            filename = f"weekend_work_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            weekend_work_df.to_excel(filename, index=False)
            print(f"Exported to {filename}")
    else:
        print("No weekend work records found.")
    
    # Check if there are still missed weekend work records
    if len(missed_df) > 0:
        print(f"\nWARNING: Found {len(missed_df)} potential weekend work records not properly labeled:")
        print(missed_df)
        
        fix = input("\nUpdate these records to 'Weekend Work'? (y/n): ").lower().strip()
        if fix == 'y':
            updated = update_missed_weekend_work()
            print(f"Updated {updated} records.")

if __name__ == "__main__":
    main()
