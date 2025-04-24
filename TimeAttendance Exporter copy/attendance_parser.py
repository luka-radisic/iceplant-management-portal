#!/usr/bin/env python3
import re
import os
import logging
import pandas as pd
from datetime import datetime, timedelta
import PyPDF2
import file_utils
import date_utils
from data_cleaner import is_valid_employee_name, is_date_like

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s',
                    handlers=[logging.StreamHandler()])
logger = logging.getLogger(__name__)

class AtlantisAttendanceParser:
    """
    Parser specialized for Atlantis Fishing Development Corp attendance cards.
    """
    
    def __init__(self, debug=False, use_temp_dir=True):
        self.debug = debug
        self.use_temp_dir = use_temp_dir
    
    def parse_file(self, pdf_path):
        """Parse a PDF file and extract attendance data."""
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        # Extract text from PDF
        text = self._extract_pdf_text(pdf_path)
        
        # Save debug file
        if self.debug:
            debug_filename = f"{os.path.basename(pdf_path)}_full_debug.txt"
            file_utils.save_debug_text(text, debug_filename, self.use_temp_dir)
            logger.info(f"Saved full text to debug file")
        
        # Parse the text
        return self.parse_text(text, os.path.basename(pdf_path))
    
    def _extract_pdf_text(self, pdf_path):
        """Extract text from all pages of a PDF file."""
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            full_text = ""
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                full_text += page_text
                
                # Save individual page debug files
                if self.debug:
                    debug_filename = f"{os.path.basename(pdf_path)}_page{page_num+1}_debug.txt"
                    file_utils.save_debug_text(page_text, debug_filename, self.use_temp_dir)
            
            return full_text
    
    def parse_text(self, text, source_filename=""):
        """
        Parse attendance data from the extracted text.
        """
        data = []
        
        # Extract company name and report period
        company_name = ""
        company_match = re.search(r"^(.+?)\n", text)
        if company_match:
            company_name = company_match.group(1).strip()
        
        # Extract report period using the utility function
        start_date, end_date = date_utils.extract_report_period(text)
        report_period = f"{start_date} to {end_date}" if start_date and end_date else ""
        
        if self.debug:
            logger.info(f"Company: {company_name}, Period: {report_period}")
        
        # Generate complete date range from the report period
        expected_dates = []
        if start_date and end_date:
            expected_dates = date_utils.generate_date_range(start_date, end_date)
            if self.debug:
                logger.info(f"Report period covers {len(expected_dates)} dates: {expected_dates[0]} to {expected_dates[-1]}")
        
        # Split text into employee blocks - more robust approach
        employee_blocks = self._split_employee_blocks(text)
        
        if self.debug:
            logger.info(f"Found {len(employee_blocks)} employee blocks")
            # Save each employee block to a separate file for analysis
            for i, block in enumerate(employee_blocks):
                block_filename = f"employee_block_{i+1}.txt"
                file_utils.save_debug_text(block, block_filename, self.use_temp_dir)
        
        # Process each employee block
        for i, block in enumerate(employee_blocks):
            employee_data = self._process_employee_block(block, i+1, expected_dates, start_date, end_date)
            
            # Add additional fields to each record
            for record in employee_data:
                record['Source'] = source_filename
                record['Company'] = company_name
                record['Report Period'] = report_period
            
            data.extend(employee_data)
        
        return data
    
    def _split_employee_blocks(self, text):
        """
        Split the text into employee blocks more reliably.
        Each employee block starts with an employee name and ID.
        """
        # First split by "Full Name" / "Employee No." which marks the start of sections
        parts = re.split(r"Full Name\s+Employee No\.", text)
        
        # Skip the first part (header)
        if len(parts) > 1:
            parts = parts[1:]
        
        # Now extract individual employee blocks
        employee_blocks = []
        for part in parts:
            if not part.strip():
                continue
            
            # Split by employee pattern - looking for name followed by ID number
            emp_matches = re.finditer(r"([^\n]+?)\s*\n\s*(\d+)\s*\n", part, re.DOTALL)
            
            last_pos = 0
            for match in emp_matches:
                if match.start() > last_pos:
                    # Add the previous employee block
                    if last_pos > 0:
                        block = part[last_pos:match.start()]
                        employee_blocks.append(block)
                    
                last_pos = match.start()
            
            # Add the last employee block in this part
            if last_pos < len(part):
                employee_blocks.append(part[last_pos:])
        
        # If the above approach doesn't find any blocks, fall back to simpler method
        if not employee_blocks:
            for part in parts:
                if not part.strip():
                    continue
                
                # Try to find the employee name and ID at the start of the block
                match = re.search(r"^\s*([^\n]+?)\s*\n\s*(\d+)", part.strip())
                if match:
                    employee_blocks.append(part)
        
        return employee_blocks
    
    def _process_employee_block(self, block, block_num, expected_dates=None, start_date=None, end_date=None):
        """Process a single employee block with more robust parsing and validation."""
        records = []
        
        # Enhanced employee information extraction with validation
        employee_match = re.search(r"^\s*([^\n]+?)\s*\n\s*(\d+)", block.strip(), re.DOTALL)
        if not employee_match:
            if self.debug:
                logger.warning(f"Could not find employee info in block {block_num}")
            return records
            
        employee_name = employee_match.group(1).strip()
        employee_id = employee_match.group(2).strip()
        
        # Skip blocks that contain timestamp entries or other metadata
        if re.match(r'Date/Time:', employee_name) or employee_name in ['Review', 'Approve']:
            if self.debug:
                logger.warning(f"Skipping timestamp/metadata block: '{employee_name}'")
            return records
        
        # Validate employee name - check if it's not a date or other invalid format
        if not is_valid_employee_name(employee_name):
            if self.debug:
                logger.warning(f"Invalid employee name detected: '{employee_name}' with ID {employee_id}")
                logger.warning("This block will be skipped to avoid incorrect data")
            return records
        
        # Check for swapped name and ID
        if is_valid_employee_name(employee_id) and employee_id.isalpha():
            # Possible swap, log warning and continue with caution
            if self.debug:
                logger.warning(f"Possible name/ID swap: '{employee_name}' and '{employee_id}' - please verify")
        
        if self.debug:
            logger.info(f"Processing employee {employee_name} (ID: {employee_id})")
        
        # Use more aggressive date pattern detection
        # Look for YYYY-MM-DD format dates
        date_pattern = r"(20\d{2}-\d{2}-\d{2})"
        dates = re.findall(date_pattern, block)
        
        # Extract day of week abbreviations (Mon., Tue., etc.)
        day_pattern = r"([A-Za-z]+\.)"  # More inclusive pattern
        day_matches = re.findall(day_pattern, block)
        days = [day for day in day_matches if day in date_utils.DAY_ABBR]
        
        # Extract required work hours (typically 08:00-17:00 format)
        req_pattern = r"(\d{2}:\d{2}-\d{2}:\d{2})"
        req_matches = re.findall(req_pattern, block)
        required_times = [t for t in req_matches if t.startswith("08:00")]
        
        # Extract actual attendance times with more thorough pattern matching
        actual_times = []
        
        # First method: look at line starts
        for line in block.split('\n'):
            line = line.strip()
            # Look for time patterns of various formats
            time_match = re.match(r"^((?:\d{1,2}:\d{2}-\d{1,2}:\d{2})|(?:0\.00-0\.00)|(?:\d{1,2}:\d{2}-0\.00))", line)
            if time_match and not line.startswith("08:00"):  # Exclude required times
                actual_times.append(time_match.group(1))
        
        # Second method: look for time patterns not at line starts
        # This helps catch times that might be in a different format or position
        if len(actual_times) < len(dates):
            alt_pattern = r"(?<!\d)(\d{1,2}:\d{2}-\d{1,2}:\d{2}|0\.00-0\.00|\d{1,2}:\d{2}-0\.00)(?!\d)"
            alt_matches = re.findall(alt_pattern, block)
            
            # Filter out required times and add unique actual times
            for time_str in alt_matches:
                if not time_str.startswith("08:00") and time_str not in actual_times:
                    actual_times.append(time_str)
        
        if self.debug:
            logger.info(f"Found {len(dates)} dates, {len(days)} days, {len(required_times)} required times, {len(actual_times)} actual times")
            if dates:
                logger.info(f"Date range: {min(dates)} to {max(dates)}")
            if expected_dates and len(dates) < len(expected_dates):
                logger.warning(f"Missing some dates! Expected {len(expected_dates)}, found {len(dates)}")
        
        # Create a mapping of dates to days for validation
        date_day_map = {}
        for date_str in dates:
            expected_day = date_utils.get_day_abbr(date_str)
            if expected_day:
                date_day_map[date_str] = expected_day
        
        # Try to match dates with attendance data more accurately
        attendance_data = self._match_attendance_data(dates, days, required_times, actual_times)
        
        # Create records for each date with matched data
        for date_str, data in attendance_data.items():
            day = data.get('day', date_day_map.get(date_str, ""))
            required_time = data.get('required_time', "08:00-17:00")  # Default if missing
            actual_time = data.get('actual_time', "0.00-0.00")  # Default if missing
            
            # Parse actual time in and out
            is_present = actual_time != "0.00-0.00" and "-0.00" not in actual_time
            if is_present:
                try:
                    time_parts = actual_time.split('-')
                    time_in = time_parts[0].strip()
                    time_out = time_parts[1].strip() if len(time_parts) > 1 else "0:00"
                except (ValueError, IndexError):
                    time_in = time_out = "0:00"
            else:
                time_in = time_out = "0:00"  # Absent
            
            # Create record
            record = {
                'Employee Name': employee_name,
                'Employee ID': employee_id,
                'Date': date_str,
                'Day': day,
                'Required Time': required_time,
                'Time In': time_in,
                'Time Out': time_out,
                'Actual Time': actual_time,
                'Status': 'Present' if is_present else 'Absent'
            }
            
            records.append(record)
        
        # If we have the expected date range but are missing some dates, fill them in
        if expected_dates:
            existing_dates = {record['Date'] for record in records}
            for date_str in expected_dates:
                if date_str not in existing_dates:
                    # Get the day of week
                    day = date_utils.get_day_abbr(date_str)
                    
                    # Determine if weekend
                    is_weekend = date_utils.get_day_of_week(date_str) >= 5  # 5=Sat, 6=Sun
                    
                    # Get typical required time
                    typical_required = "08:00-17:00"  # Default
                    if required_times:
                        typical_required = required_times[0]
                    
                    # Create record for missing date
                    record = {
                        'Employee Name': employee_name,
                        'Employee ID': employee_id,
                        'Date': date_str,
                        'Day': day,
                        'Required Time': typical_required,
                        'Time In': "0:00",
                        'Time Out': "0:00",
                        'Actual Time': "0.00-0.00",
                        'Status': 'Weekend' if is_weekend else 'Absent',
                        'Note': 'Inferred missing date'
                    }
                    
                    records.append(record)
                    
                    if self.debug:
                        logger.info(f"Added missing date {date_str} ({day}) for {employee_name}")
        
        return records
    
    def _match_attendance_data(self, dates, days, required_times, actual_times):
        """
        Improved algorithm to match dates with their corresponding attendance data.
        Returns a dictionary mapping dates to their day, required time, and actual time.
        """
        attendance_data = {}
        
        # First match by position for clearly aligned data
        min_length = min(len(dates), len(days), len(required_times), len(actual_times))
        
        for i in range(min_length):
            date_str = dates[i]
            attendance_data[date_str] = {
                'day': days[i],
                'required_time': required_times[i],
                'actual_time': actual_times[i]
            }
        
        # For dates that weren't matched by position, try to match by day of week
        unmatched_dates = dates[min_length:]
        for date_str in unmatched_dates:
            # Calculate expected day of week
            expected_day = date_utils.get_day_abbr(date_str)
            
            # Look for a matching day in the remaining days list
            remaining_days = days[min_length:]
            matching_day_index = -1
            
            for j, day in enumerate(remaining_days):
                if day == expected_day:
                    matching_day_index = j
                    break
            
            if matching_day_index >= 0:
                # Found a matching day
                day_index = min_length + matching_day_index
                
                # Get corresponding required and actual times if available
                required_time = required_times[day_index] if day_index < len(required_times) else "08:00-17:00"
                actual_time = actual_times[day_index] if day_index < len(actual_times) else "0.00-0.00"
                
                attendance_data[date_str] = {
                    'day': expected_day,
                    'required_time': required_time,
                    'actual_time': actual_time
                }
            else:
                # No matching day found, use expected day and defaults
                attendance_data[date_str] = {
                    'day': expected_day,
                    'required_time': "08:00-17:00",  # Default
                    'actual_time': "0.00-0.00"  # Default (absent)
                }
        
        return attendance_data

def main():
    """Simple command-line usage example."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Parse attendance data from PDF files.')
    parser.add_argument('pdf_file', help='Path to PDF file to parse')
    parser.add_argument('--output', '-o', help='Output Excel file name', default='attendance_data.xlsx')
    parser.add_argument('--debug', '-d', action='store_true', help='Enable debug mode')
    parser.add_argument('--cleanup', '-c', action='store_true', 
                        help='Clean up temporary files after successful run')
    args = parser.parse_args()
    
    attendance_parser = AtlantisAttendanceParser(debug=args.debug)
    
    try:
        # Clean up old temporary files (24 hours or older)
        file_utils.cleanup_temp_files(age_hours=24)
        
        data = attendance_parser.parse_file(args.pdf_file)
        
        if data:
            df = pd.DataFrame(data)
            
            # Sort by employee and date
            if 'Date' in df.columns:
                df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
                df = df.sort_values(['Employee Name', 'Date'])
                df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
            
            df.to_excel(args.output, index=False)
            print(f"Successfully extracted {len(data)} records to {args.output}")
            
            # Display a summary
            if 'Status' in df.columns:
                present_count = len(df[df['Status'] == 'Present'])
                absent_count = len(df[df['Status'] == 'Absent'])
                weekend_count = len(df[df['Status'] == 'Weekend']) if 'Weekend' in df['Status'].values else 0
                print(f"Summary: {present_count} present, {absent_count} absent, {weekend_count} weekend days")
                
                # Show records per employee
                employee_counts = df['Employee Name'].value_counts()
                print("\nRecords by employee:")
                for employee, count in employee_counts.items():
                    print(f"  {employee}: {count} records")
            
            # Clean up temporary files if requested
            if args.cleanup:
                print("Cleaning up temporary files...")
                file_utils.cleanup_all_temp_files()
        else:
            print("No data was extracted from the PDF.")
    except Exception as e:
        print(f"Error: {str(e)}")
        if args.debug:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()
