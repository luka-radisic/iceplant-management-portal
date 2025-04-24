import re
import pandas as pd
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def is_date_like(text):
    """Check if a string looks like a date."""
    # Common date patterns to check
    date_patterns = [
        r"\d{4}-\d{2}-\d{2}",       # YYYY-MM-DD
        r"\d{2}/\d{2}/\d{4}",       # MM/DD/YYYY or DD/MM/YYYY
        r"\d{4}/\d{2}/\d{2}",       # YYYY/MM/DD
        r"\d{1,2}-[A-Za-z]+-\d{4}"  # DD-Mon-YYYY
    ]
    
    # Check if the text matches any date pattern
    for pattern in date_patterns:
        if re.match(pattern, text.strip()):
            return True
    
    # Try parsing as a date
    try:
        datetime.strptime(text.strip(), '%Y-%m-%d')
        return True
    except ValueError:
        pass
    
    try:
        datetime.strptime(text.strip(), '%Y/%m/%d')
        return True
    except ValueError:
        pass
    
    return False

def is_timestamp_entry(text):
    """Check if text is a timestamp entry that should be excluded."""
    if not text or not isinstance(text, str):
        return False
    
    # Check for specific patterns we want to exclude
    timestamp_patterns = [
        r'Date/Time:\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}',  # Date/Time:2025/02/24 08:57
        r'Review',                                      # Single word entries that aren't names
        r'Approve',
        r'Required Work'
    ]
    
    for pattern in timestamp_patterns:
        if re.match(pattern, text.strip()):
            return True
    
    return False

def is_valid_employee_name(name):
    """Check if a string is likely to be a valid employee name."""
    if not name or not isinstance(name, str) or len(name.strip()) < 2:
        return False
    
    # Check if it's a timestamp entry
    if is_timestamp_entry(name):
        return False
    
    # Check if it looks like a date
    if is_date_like(name):
        return False
    
    # Check if it's just numbers
    if re.match(r'^\d+$', name.strip()):
        return False
    
    # Check for minimal text content (at least 2 letters)
    if len(re.sub(r'[^a-zA-Z]', '', name)) < 2:
        return False
    
    return True

def clean_attendance_data(df, save_invalid=True):
    """Clean the attendance data DataFrame."""
    original_rows = len(df)
    
    # Identify rows with invalid employee names
    invalid_name_mask = df['Employee Name'].apply(lambda x: not is_valid_employee_name(str(x)) if pd.notna(x) else True)
    invalid_rows = df[invalid_name_mask].copy()
    
    # Check specifically for timestamp entries
    timestamp_entries = df[df['Employee Name'].apply(lambda x: is_timestamp_entry(str(x)) if pd.notna(x) else False)]
    timestamp_count = len(timestamp_entries)
    
    if len(invalid_rows) > 0:
        logger.warning(f"Found {len(invalid_rows)} rows with invalid employee names")
        if timestamp_count > 0:
            logger.warning(f"Including {timestamp_count} timestamp or metadata entries that will be removed")
        
        # Option 1: Drop rows with invalid employee names
        df = df[~invalid_name_mask].copy()
        
        # Option 2: For debugging purposes, save invalid rows to a separate file
        if save_invalid:
            try:
                invalid_rows.to_excel('invalid_employee_records.xlsx', index=False)
                logger.info("Invalid records saved to 'invalid_employee_records.xlsx' for review")
            except Exception as e:
                logger.error(f"Failed to save invalid records: {str(e)}")
    
    # Check for potential ID/name swaps
    potential_swaps = df[df['Employee ID'].apply(lambda x: is_valid_employee_name(str(x)) if pd.notna(x) else False)]
    
    if len(potential_swaps) > 0:
        logger.warning(f"Found {len(potential_swaps)} rows where employee ID looks like a name")
        # Could implement a fix here to swap ID and name if needed
    
    # Report on cleaning
    rows_after = len(df)
    if rows_after < original_rows:
        logger.warning(f"Removed {original_rows - rows_after} invalid rows during cleaning")
    
    return df

def analyze_attendance_data(df):
    """Analyze attendance data and return a summary report."""
    summary = {
        'total_records': len(df),
        'unique_employees': len(df['Employee Name'].unique()) if 'Employee Name' in df.columns else 0,
        'date_range': [],
        'status_counts': {},
        'employee_records': {}
    }
    
    # Get date range
    if 'Date' in df.columns:
        dates = pd.to_datetime(df['Date'], errors='coerce')
        min_date = dates.min()
        max_date = dates.max()
        if not pd.isna(min_date) and not pd.isna(max_date):
            summary['date_range'] = [min_date.strftime('%Y-%m-%d'), max_date.strftime('%Y-%m-%d')]
    
    # Count status
    if 'Status' in df.columns:
        summary['status_counts'] = df['Status'].value_counts().to_dict()
    
    # Records per employee
    if 'Employee Name' in df.columns:
        for name, group in df.groupby('Employee Name'):
            summary['employee_records'][name] = len(group)
    
    return summary

def main():
    """Simple command-line utility for cleaning attendance data files."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Clean attendance data files')
    parser.add_argument('input_file', help='Excel file with attendance data to clean')
    parser.add_argument('--output', '-o', help='Output file name', default=None)
    parser.add_argument('--analyze', '-a', action='store_true', help='Analyze data instead of cleaning')
    args = parser.parse_args()
    
    try:
        # Read the Excel file
        df = pd.read_excel(args.input_file)
        print(f"Read {len(df)} records from {args.input_file}")
        
        if args.analyze:
            # Just analyze the data
            summary = analyze_attendance_data(df)
            print("\nData Analysis:")
            print(f"- Total records: {summary['total_records']}")
            print(f"- Unique employees: {summary['unique_employees']}")
            
            if summary['date_range']:
                print(f"- Date range: {summary['date_range'][0]} to {summary['date_range'][1]}")
            
            print("\nStatus distribution:")
            for status, count in summary['status_counts'].items():
                print(f"  {status}: {count}")
            
            print("\nRecords per employee:")
            for employee, count in summary['employee_records'].items():
                print(f"  {employee}: {count}")
        else:
            # Clean the data
            cleaned_df = clean_attendance_data(df)
            
            # Save the cleaned data
            output_file = args.output or args.input_file.replace('.xlsx', '_cleaned.xlsx')
            cleaned_df.to_excel(output_file, index=False)
            print(f"Saved {len(cleaned_df)} cleaned records to {output_file}")
            
            # Print a brief summary
            print(f"Original records: {len(df)}")
            print(f"Records after cleaning: {len(cleaned_df)}")
            if len(df) > len(cleaned_df):
                print(f"Removed {len(df) - len(cleaned_df)} invalid records")
    
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
