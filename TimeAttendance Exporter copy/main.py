import os
import argparse
import pandas as pd
from attendance_parser import AtlantisAttendanceParser
import file_utils
import logging
from data_cleaner import clean_attendance_data, analyze_attendance_data

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description='Extract time attendance data from PDF files.')
    parser.add_argument('--input', '-i', type=str, default='./pdfs', 
                        help='Directory containing PDF files (default: ./pdfs)')
    parser.add_argument('--output', '-o', type=str, default='attendance_data.xlsx',
                        help='Output Excel file name (default: attendance_data.xlsx)')
    parser.add_argument('--debug', '-d', action='store_true', 
                        help='Enable debug mode with verbose logging')
    parser.add_argument('--cleanup', '-c', action='store_true',
                        help='Clean up temporary files after successful run')
    parser.add_argument('--temp-dir', '-t', type=str, default=file_utils.DEFAULT_TEMP_DIR,
                        help='Temporary directory for debug files')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Show more detailed output during processing')
    parser.add_argument('--no-clean', action='store_true',
                        help='Skip data cleaning step (keeps all records)')
    args = parser.parse_args()
    
    # Set custom temp dir if provided
    if args.temp_dir != file_utils.DEFAULT_TEMP_DIR:
        file_utils.DEFAULT_TEMP_DIR = args.temp_dir
    
    # Ensure temp directory exists
    file_utils.ensure_dir_exists(file_utils.get_temp_dir())
    
    # Clean up old temporary files (older than 24 hours)
    file_utils.cleanup_temp_files(age_hours=24)
    
    # Create input directory if it doesn't exist
    if not os.path.exists(args.input):
        os.makedirs(args.input)
        print(f"Created input directory: {args.input}")
        print(f"Please place your PDF files in {args.input} and run this script again.")
        return
    
    # Check if there are any PDF files
    pdf_files = [f for f in os.listdir(args.input) if f.lower().endswith('.pdf')]
    if not pdf_files:
        print(f"No PDF files found in {args.input}. Please add PDF files and try again.")
        return
    
    print(f"Found {len(pdf_files)} PDF files. Processing...")
    
    # Initialize the specialized parser
    attendance_parser = AtlantisAttendanceParser(debug=args.debug)
    
    # Process all PDF files
    all_data = []
    successful = True
    
    try:
        for filename in pdf_files:
            print(f"Processing {filename}...")
            pdf_path = os.path.join(args.input, filename)
            try:
                data = attendance_parser.parse_file(pdf_path)
                all_data.extend(data)
                print(f"  - Extracted {len(data)} records.")
                
                if args.verbose and data:
                    # Show date range for this file
                    dates = [record['Date'] for record in data if 'Date' in record]
                    if dates:
                        min_date = min(dates)
                        max_date = max(dates)
                        print(f"  - Date range: {min_date} to {max_date}")
                    
                    # Show employees in this file
                    employees = set(record['Employee Name'] for record in data if 'Employee Name' in record)
                    print(f"  - Employees: {', '.join(employees)}")
            except Exception as e:
                print(f"  - Error processing {filename}: {str(e)}")
                successful = False
                if args.debug:
                    import traceback
                    traceback.print_exc()
        
        if all_data:
            # Write to Excel
            df = pd.DataFrame(all_data)
            
            # Clean the data unless --no-clean flag is set
            if not args.no_clean:
                print("Cleaning attendance data...")
                original_count = len(df)
                df = clean_attendance_data(df)
                if len(df) < original_count:
                    print(f"Removed {original_count - len(df)} invalid records during cleaning")
            
            # Convert dates to proper datetime format for sorting
            if 'Date' in df.columns:
                df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
                
                # Sort by employee name, then date
                df = df.sort_values(by=['Employee Name', 'Date'])
                
                # Get overall date range for reporting
                min_date = df['Date'].min().strftime('%Y-%m-%d')
                max_date = df['Date'].max().strftime('%Y-%m-%d')
                
                # Convert back to string format for display
                df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
                
                print(f"\nExtracted attendance records from {min_date} to {max_date}")
            
            # Reorder columns for better readability
            columns_order = [
                'Employee Name', 'Employee ID', 'Date', 'Day', 
                'Required Time', 'Time In', 'Time Out', 'Actual Time', 
                'Status', 'Company', 'Report Period', 'Source'
            ]
            
            # Only include columns that exist in the dataframe
            final_columns = [col for col in columns_order if col in df.columns]
            # Add any additional columns not in our predefined order
            for col in df.columns:
                if col not in final_columns:
                    final_columns.append(col)
                    
            df = df[final_columns]
            
            # Write to Excel
            df.to_excel(args.output, index=False)
            print(f"Successfully exported {len(all_data)} records to {args.output}")
            
            # Show summary with extra validation info
            if 'Status' in df.columns:
                present_count = len(df[df['Status'] == 'Present'])
                absent_count = len(df[df['Status'] == 'Absent'])
                weekend_count = len(df[df['Status'] == 'Weekend']) if 'Weekend' in df['Status'].values else 0
                inferred_count = len(df[df.get('Note') == 'Inferred missing date']) if 'Note' in df.columns else 0
                
                print(f"Summary: {present_count} present, {absent_count} absent, {weekend_count} weekend days")
                if inferred_count > 0:
                    print(f"         {inferred_count} inferred/missing dates filled in")
                
                # Show records by employee
                employee_counts = df['Employee Name'].value_counts()
                date_counts = df.groupby('Employee Name')['Date'].nunique()
                
                print("\nRecords by employee:")
                for employee, count in employee_counts.items():
                    date_count = date_counts.get(employee, 0)
                    print(f"  {employee}: {count} records ({date_count} unique dates)")
            
            # Cleanup temp files if requested and all processing was successful
            if args.cleanup and successful:
                print("Cleaning up temporary files...")
                file_utils.cleanup_all_temp_files()
                
        else:
            print("No data was extracted. Please check your PDF files.")
            print("\nTry running with --debug flag for more information.")
    
    except Exception as e:
        print(f"Error during processing: {str(e)}")
        successful = False
        if args.debug:
            import traceback
            traceback.print_exc()
        
    # If there was an error, keep temp files for debugging
    if not successful and args.debug:
        print("Note: Temporary files were kept for debugging purposes.")
        print(f"You can find them in: {file_utils.get_temp_dir()}")

if __name__ == "__main__":
    main()