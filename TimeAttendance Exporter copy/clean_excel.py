#!/usr/bin/env python3
import os
import argparse
import pandas as pd
from data_cleaner import clean_attendance_data, analyze_attendance_data, is_timestamp_entry
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def clean_excel_file(input_file, output_file=None, analyze_only=False, backup=True):
    """
    Clean an Excel file containing attendance data.
    
    Args:
        input_file (str): Path to the input Excel file
        output_file (str, optional): Path to save the cleaned Excel file. If None, uses input filename with '_cleaned' suffix
        analyze_only (bool): If True, only analyze without modifying the file
        backup (bool): If True, create a backup of the original file before overwriting
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Read the Excel file
        df = pd.read_excel(input_file)
        original_count = len(df)
        print(f"Read {original_count} records from {input_file}")
        
        # Analyze data before cleaning
        print("\nAnalyzing data...")
        analyze_data(df, "Before cleaning:")
        
        # Check specifically for timestamp entries
        timestamp_entries = df[df['Employee Name'].apply(lambda x: is_timestamp_entry(str(x)) if pd.notna(x) else False)]
        timestamp_count = len(timestamp_entries)
        
        if timestamp_count > 0:
            print(f"\nFound {timestamp_count} timestamp/metadata entries that should be removed:")
            for name, count in timestamp_entries['Employee Name'].value_counts().items():
                print(f"  '{name}': {count} entries")
        
        if analyze_only:
            print("\nAnalysis complete. No changes made (analyze-only mode).")
            return True
        
        # Create a backup if requested
        if backup and output_file != input_file:
            backup_file = input_file + '.bak'
            try:
                df.to_excel(backup_file, index=False)
                print(f"Created backup of original file: {backup_file}")
            except Exception as e:
                print(f"Warning: Could not create backup: {str(e)}")
        
        # Clean the data
        print("\nCleaning data...")
        cleaned_df = clean_attendance_data(df, save_invalid=True)
        
        # Determine output file name
        if output_file is None:
            base, ext = os.path.splitext(input_file)
            output_file = f"{base}_cleaned{ext}"
        
        # Save the cleaned data
        cleaned_df.to_excel(output_file, index=False)
        print(f"Saved {len(cleaned_df)} cleaned records to {output_file}")
        
        # Analyze data after cleaning
        print("\nAnalyzing cleaned data...")
        analyze_data(cleaned_df, "After cleaning:")
        
        # Print a brief summary
        removed = original_count - len(cleaned_df)
        print(f"\nSummary: Removed {removed} invalid records ({removed/original_count*100:.1f}%)")
        
        return True
    
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def analyze_data(df, title="Data Analysis"):
    """Print a brief analysis of the DataFrame."""
    unique_employees = len(df['Employee Name'].unique()) if 'Employee Name' in df.columns else 0
    
    print(f"{title}")
    print(f"Total records: {len(df)}")
    print(f"Unique employees: {unique_employees}")
    
    if 'Date' in df.columns:
        try:
            dates = pd.to_datetime(df['Date'], errors='coerce')
            min_date = dates.min()
            max_date = dates.max()
            if not pd.isna(min_date) and not pd.isna(max_date):
                print(f"Date range: {min_date.strftime('%Y-%m-%d')} to {max_date.strftime('%Y-%m-%d')}")
        except:
            pass

def main():
    parser = argparse.ArgumentParser(description='Clean attendance data Excel files')
    parser.add_argument('input_file', help='Excel file with attendance data to clean')
    parser.add_argument('--output', '-o', help='Output file name (default: input_file_cleaned.xlsx)')
    parser.add_argument('--analyze', '-a', action='store_true', 
                        help='Only analyze the file without cleaning')
    parser.add_argument('--no-backup', action='store_true',
                        help='Skip creating a backup of the original file')
    args = parser.parse_args()
    
    clean_excel_file(
        args.input_file, 
        args.output, 
        analyze_only=args.analyze, 
        backup=not args.no_backup
    )

if __name__ == "__main__":
    main()
