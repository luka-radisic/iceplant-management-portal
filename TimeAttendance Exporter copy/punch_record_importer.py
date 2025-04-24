#!/usr/bin/env python3
import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import re
from db_interface import AttendanceDatabase, DATABASE_FILE

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PunchRecordProcessor:
    """
    Processor for punch record Excel files that contain multiple check-ins/check-outs per day.
    This processor extracts the first check-in as TIME IN and last check-in as TIME OUT.
    """
    
    def __init__(self, debug=False):
        self.debug = debug
        if debug:
            logger.setLevel(logging.DEBUG)
    
    def process_file(self, file_path):
        """
        Process the punch record Excel file and return structured data.
        
        Args:
            file_path: Path to the Excel file
            
        Returns:
            DataFrame ready for import into the database
        """
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return None
            
        try:
            # Read the Excel file
            logger.info(f"Reading punch record file: {file_path}")
            raw_df = pd.read_excel(file_path)
            
            if self.debug:
                logger.debug(f"Raw data columns: {raw_df.columns.tolist()}")
                logger.debug(f"First few rows: {raw_df.head().to_dict('records')}")
            
            # Process the data - identify relevant columns
            # Note: Column names may vary, so we need to identify them
            column_mapping = self._identify_columns(raw_df)
            if not column_mapping:
                logger.error("Could not identify necessary columns in the Excel file")
                return None
            
            # Extract the relevant data and transform it
            processed_data = self._transform_data(raw_df, column_mapping)
            
            return processed_data
            
        except Exception as e:
            logger.error(f"Error processing punch record file: {str(e)}")
            if self.debug:
                import traceback
                logger.debug(traceback.format_exc())
            return None
    
    def _identify_columns(self, df):
        """
        Identify the relevant columns in the DataFrame.
        
        Returns:
            Dictionary mapping standard column names to actual column names in the file
        """
        # Initialize column mapping with None values
        column_map = {
            'employee_id': None,
            'employee_name': None,
            'date': None,
            'time': None,
            'datetime': None,  # Added for combined date+time column
            'punch_type': None,
            'department': None
        }
        
        # Common variations of column names to look for
        column_variations = {
            'employee_id': ['Employee ID', 'ID', 'Emp. ID', 'EmpID', 'Emp ID', 'Employee No.', 'Emp No', 'User ID'],
            'employee_name': ['Employee Name', 'Name', 'Full Name', 'EmpName', 'Employee'],
            'date': ['Date', 'Punch Date', 'Check Date', 'Work Date'],
            'time': ['Time', 'Punch Time', 'Check Time', 'Time of Check'],
            'datetime': ['Time', 'DateTime', 'Date Time', 'Timestamp'],
            'punch_type': ['Type', 'Punch Type', 'Check Type', 'In/Out', 'Status', 'Attendance Event'],
            'department': ['Department', 'Dept', 'Dept.', 'Division']
        }
        
        # Check for specific punch record report format
        if 'Time' in df.columns and 'User ID' in df.columns and 'Name' in df.columns and 'Attendance Event' in df.columns:
            # This is likely the specific punch report format we're looking for
            column_map['datetime'] = 'Time'
            column_map['employee_id'] = 'User ID'
            column_map['employee_name'] = 'Name'
            column_map['punch_type'] = 'Attendance Event'
            column_map['department'] = 'Department'
            
            if self.debug:
                logger.debug("Detected specific punch record report format")
            
            return column_map
        
        # Check for each column type
        for col_type, variations in column_variations.items():
            for var in variations:
                matches = [c for c in df.columns if var.lower() in str(c).lower()]
                if matches:
                    column_map[col_type] = matches[0]
                    break
        
        # Special handling: if we have datetime but no date/time
        if column_map['datetime'] and not column_map['date']:
            # The datetime column will be processed to extract date and time
            if self.debug:
                logger.debug(f"Using {column_map['datetime']} as combined date and time column")
        
        # Verify we have the essential columns
        missing_essential = [k for k, v in column_map.items() 
                            if v is None and k in ['employee_id', 'employee_name']]
        
        # Also check if we have either date+time or datetime
        if not column_map['date'] and not column_map['datetime']:
            missing_essential.append('date/time')
        
        if missing_essential:
            logger.error(f"Missing essential columns: {missing_essential}")
            return None
        
        if self.debug:
            logger.debug(f"Column mapping: {column_map}")
        
        return column_map
    
    def _transform_data(self, df, column_map):
        """
        Transform the raw data into the format needed for the database.
        Extract first punch as TIME_IN and last punch as TIME_OUT.
        """
        try:
            # Create a copy to avoid modifying the original
            work_df = df.copy()
            
            # Rename columns for easier processing
            columns_to_rename = {v: k for k, v in column_map.items() if v is not None}
            work_df = work_df.rename(columns=columns_to_rename)
            
            # Handle combined date and time column if present
            if 'datetime' in work_df.columns:
                try:
                    # Check if the datetime column is already in datetime format
                    if not pd.api.types.is_datetime64_any_dtype(work_df['datetime']):
                        # Try to convert to datetime format
                        work_df['datetime'] = pd.to_datetime(work_df['datetime'])
                    
                    # Extract date and time components
                    work_df['date'] = work_df['datetime'].dt.date
                    work_df['date_str'] = work_df['datetime'].dt.strftime('%Y-%m-%d')
                    work_df['time'] = work_df['datetime'].dt.strftime('%H:%M')
                    
                    if self.debug:
                        logger.debug(f"Extracted date and time from {column_map['datetime']} column")
                except Exception as e:
                    logger.error(f"Error processing datetime column: {str(e)}")
                    return None
            # Handle separate date column
            elif 'date' in work_df.columns:
                # Ensure date is in datetime format
                if pd.api.types.is_datetime64_any_dtype(work_df['date']):
                    work_df['date_str'] = work_df['date'].dt.strftime('%Y-%m-%d')
                else:
                    # Try to parse the date column if it's not already a datetime
                    try:
                        work_df['date'] = pd.to_datetime(work_df['date'])
                        work_df['date_str'] = work_df['date'].dt.strftime('%Y-%m-%d')
                    except:
                        logger.warning("Could not convert date column to datetime. Using as-is.")
                        work_df['date_str'] = work_df['date']
            
            # Generate day of week
            if 'date' in work_df.columns and pd.api.types.is_datetime64_any_dtype(work_df['date']):
                try:
                    work_df['day'] = work_df['date'].dt.strftime('%a.')
                    work_df['weekday'] = work_df['date'].dt.weekday
                except:
                    work_df['day'] = 'Unknown'
                    work_df['weekday'] = -1
            elif 'datetime' in work_df.columns and pd.api.types.is_datetime64_any_dtype(work_df['datetime']):
                try:
                    work_df['day'] = work_df['datetime'].dt.strftime('%a.')
                    work_df['weekday'] = work_df['datetime'].dt.weekday
                except:
                    work_df['day'] = 'Unknown'
                    work_df['weekday'] = -1
            else:
                work_df['day'] = 'Unknown'
                work_df['weekday'] = -1
            
            # Group by employee and date to find first and last punch for each day
            logger.info("Grouping data by employee and date to find first and last punches")
            result_data = []
            
            # Define groupby columns
            groupby_cols = ['employee_id', 'employee_name', 'date_str']
            optional_cols = ['day', 'weekday', 'department']
            
            for col in optional_cols:
                if col in work_df.columns:
                    groupby_cols.append(col)
            
            # Standard work hours
            STANDARD_START_TIME = '08:00'
            STANDARD_END_TIME = '17:00'
            LATE_THRESHOLD_MINUTES = 60  # Changed from 120 to 60 - more sensitive detection
            EARLY_THRESHOLD_MINUTES = 60  # Changed from 120 to 60 - more sensitive detection
            TIME_PROXIMITY_MINUTES = 10   # Increased from 5 to 10 minutes
            
            # Add debugging for department detection
            if 'department' in column_map and column_map['department'] is not None:
                if self.debug:
                    logger.debug(f"Department column found: {column_map['department']}")
            
            # Group by employee and date
            for name, group in work_df.groupby(groupby_cols):
                # Unpack group name
                if len(name) >= 5:  # Has all optional columns
                    employee_id, employee_name, date_str, day, weekday = name[:5]
                    department = name[5] if len(name) > 5 else None
                elif len(name) == 4:  # Has day but not weekday
                    employee_id, employee_name, date_str, day = name
                    weekday = -1
                    department = None
                else:  # Basic grouping
                    employee_id, employee_name, date_str = name[:3]
                    day = 'Unknown'
                    weekday = -1
                    department = None
                
                # Sort by time or datetime to find first and last punch
                if 'datetime' in group.columns:
                    group = group.sort_values('datetime')
                else:
                    try:
                        group = group.sort_values('time')
                    except:
                        # If sorting fails, try to extract time component
                        pass
                
                if len(group) > 0:
                    # Get first and last time entries
                    if 'time' in group.columns:
                        first_punch = group['time'].iloc[0]
                        last_punch = group['time'].iloc[-1]
                    elif 'datetime' in group.columns:
                        first_punch = group['datetime'].iloc[0]
                        last_punch = group['datetime'].iloc[-1]
                        
                        # If it's a datetime object, extract time component
                        if isinstance(first_punch, (datetime, pd.Timestamp)):
                            first_punch = first_punch.strftime('%H:%M')
                        if isinstance(last_punch, (datetime, pd.Timestamp)):
                            last_punch = last_punch.strftime('%H:%M')
                    else:
                        # No time information available
                        first_punch = '00:00'
                        last_punch = '00:00'
                    
                    # Format punch times
                    first_punch_str = self._format_time(first_punch)
                    last_punch_str = self._format_time(last_punch)
                    
                    # DEBUG - print the raw values to help diagnose issues
                    if self.debug:
                        logger.debug(f"Processing record for {employee_id} on {date_str}")
                        logger.debug(f"First punch: {first_punch} -> {first_punch_str}")
                        logger.debug(f"Last punch: {last_punch} -> {last_punch_str}")
                        logger.debug(f"Record count: {len(group)}")
                    
                    # Check for various cases of incomplete records:
                    # 1. Check-in and check-out are identical
                    # 2. Check-out is missing or same as check-in
                    # 3. Only one punch record exists for the day
                    # 4. Times are very close to each other
                    is_incomplete = False
                    
                    # Case 1 & 2: Check-out missing or identical to check-in
                    if first_punch_str == last_punch_str or last_punch_str == '0:00':
                        is_incomplete = True
                        if self.debug:
                            logger.debug("Incomplete detected: Identical or missing punch")
                    
                    # Case 3: Only one record for the day - ALWAYS consider it incomplete
                    elif len(group) == 1:
                        is_incomplete = True
                        if self.debug:
                            logger.debug("Incomplete detected: Only one record for the day")
                    
                    # Case 4: Times are very close to each other
                    elif self._are_times_close(first_punch_str, last_punch_str, TIME_PROXIMITY_MINUTES):
                        is_incomplete = True
                        if self.debug:
                            logger.debug(f"Incomplete detected: Times too close ({first_punch_str} vs {last_punch_str})")
                    
                    # Check for late arrival or early departure
                    is_late = False
                    is_early_departure = False
                    
                    # Check if time in is later than standard start time + threshold
                    if self._is_time_later(first_punch_str, STANDARD_START_TIME, LATE_THRESHOLD_MINUTES):
                        is_late = True
                        if self.debug:
                            logger.debug(f"Late Work detected: {first_punch_str} > {STANDARD_START_TIME} + {LATE_THRESHOLD_MINUTES}min")
                    
                    # Check if time out is earlier than standard end time - threshold
                    if not is_incomplete and self._is_time_earlier(last_punch_str, STANDARD_END_TIME, EARLY_THRESHOLD_MINUTES):
                        is_early_departure = True
                        if self.debug:
                            logger.debug(f"Early Departure detected: {last_punch_str} < {STANDARD_END_TIME} - {EARLY_THRESHOLD_MINUTES}min")
                    
                    # Calculate actual time - but not for incomplete
                    if is_incomplete:
                        actual_time_str = "0"
                    else:
                        actual_time_str = self._calculate_duration(first_punch_str, last_punch_str)
                    
                    # Determine status - priority order for status determination:
                    status = 'No Work'  # Default status (replacing Absent)
                    
                    if first_punch_str != '0:00':  # If there's any check-in
                        if is_incomplete:
                            status = 'Incomplete'
                        elif is_late and not is_incomplete and weekday < 5:
                            status = 'Late Work'
                        elif is_early_departure and not is_incomplete and weekday < 5:
                            status = 'Early Departure'
                        elif weekday == 6:  # Sunday
                            status = 'Weekend Work' if last_punch_str != '0:00' and not is_incomplete else 'Weekend'
                        elif weekday == 5:  # Saturday
                            status = 'Present' if last_punch_str != '0:00' and not is_incomplete else 'No Work'
                        else:  # Weekday with valid check-in and check-out
                            status = 'Present' if last_punch_str != '0:00' and not is_incomplete else 'No Work'
                    elif weekday == 6:  # Sunday with no check-in
                        status = 'Weekend'
                    
                    if self.debug:
                        logger.debug(f"Final status: {status}")
                    
                    # Create record for import
                    record = {
                        'Employee ID': str(employee_id),
                        'Employee Name': str(employee_name),
                        'Date': date_str,
                        'Day': day,
                        'Time In': first_punch_str,
                        'Time Out': last_punch_str if not is_incomplete or last_punch_str != first_punch_str else '',
                        'Actual Time': actual_time_str,
                        'Status': status
                    }
                    
                    # Add department if available - ensure it's properly extracted
                    if department:
                        if self.debug:
                            logger.debug(f"Adding department for {employee_name}: {department}")
                        record['Department'] = department
                        
                    result_data.append(record)
            
            # Convert to DataFrame
            result_df = pd.DataFrame(result_data)
            
            if self.debug and not result_df.empty:
                logger.debug(f"Processed data sample: {result_df.head().to_dict('records')}")
                logger.debug(f"Total records: {len(result_df)}")
            
            return result_df
        
        except Exception as e:
            logger.error(f"Error transforming data: {str(e)}")
            if self.debug:
                import traceback
                logger.debug(traceback.format_exc())
            return None
    
    def _format_time(self, time_value):
        """
        Format the time value to a string in HH:MM format.
        """
        try:
            if isinstance(time_value, str):
                return time_value
            elif isinstance(time_value, (datetime, pd.Timestamp)):
                return time_value.strftime('%H:%M')
            else:
                return str(time_value)
        except:
            return str(time_value)
    
    def _calculate_duration(self, start_time, end_time):
        """
        Calculate the duration between start_time and end_time in minutes.
        """
        try:
            start_dt = datetime.strptime(start_time, '%H:%M')
            end_dt = datetime.strptime(end_time, '%H:%M')
            duration = (end_dt - start_dt).total_seconds() / 60  # minutes
            return f"{duration:.0f}"
        except:
            return ""
    
    def _are_times_close(self, time1, time2, threshold_minutes=5):
        """
        Check if two times are within threshold_minutes of each other
        
        Args:
            time1: First time string in HH:MM format
            time2: Second time string in HH:MM format
            threshold_minutes: Minutes threshold (default 5)
            
        Returns:
            bool: True if times are within threshold_minutes of each other
        """
        try:
            # Convert to datetime objects
            dt1 = datetime.strptime(time1, '%H:%M')
            dt2 = datetime.strptime(time2, '%H:%M')
            
            # Calculate time difference in minutes
            diff = abs((dt1 - dt2).total_seconds() / 60)
            
            # Return True if difference is less than threshold
            return diff <= threshold_minutes
        except:
            # If there's any error, return False
            return False

    def _is_time_later(self, time_str, reference_time_str, threshold_minutes=0):
        """
        Check if a time is later than a reference time by at least threshold_minutes
        
        Args:
            time_str: Time to check in HH:MM format
            reference_time_str: Reference time in HH:MM format
            threshold_minutes: Additional minutes threshold
            
        Returns:
            bool: True if time is later than reference_time + threshold_minutes
        """
        try:
            if time_str == '0:00' or reference_time_str == '0:00':
                return False
                
            # Fix for potential format issues - ensure HH:MM format
            if not re.match(r'^\d{1,2}:\d{2}$', time_str):
                time_str = self._format_time(time_str)
            if not re.match(r'^\d{1,2}:\d{2}$', reference_time_str):
                reference_time_str = self._format_time(reference_time_str)
                
            # Convert to datetime objects
            time_dt = datetime.strptime(time_str, '%H:%M')
            ref_dt = datetime.strptime(reference_time_str, '%H:%M')
            
            # Add threshold minutes to reference
            ref_dt_with_threshold = ref_dt + timedelta(minutes=threshold_minutes)
            
            # Compare
            return time_dt > ref_dt_with_threshold
        except Exception as e:
            if self.debug:
                logger.debug(f"Error in _is_time_later: {str(e)}")
            # If there's any error, return False
            return False

    def _is_time_earlier(self, time_str, reference_time_str, threshold_minutes=0):
        """
        Check if a time is earlier than a reference time by at least threshold_minutes
        
        Args:
            time_str: Time to check in HH:MM format
            reference_time_str: Reference time in HH:MM format
            threshold_minutes: Additional minutes threshold
            
        Returns:
            bool: True if time is earlier than reference_time - threshold_minutes
        """
        try:
            if time_str == '0:00' or reference_time_str == '0:00':
                return False
                
            # Fix for potential format issues - ensure HH:MM format
            if not re.match(r'^\d{1,2}:\d{2}$', time_str):
                time_str = self._format_time(time_str)
            if not re.match(r'^\d{1,2}:\d{2}$', reference_time_str):
                reference_time_str = self._format_time(reference_time_str)
                
            # Convert to datetime objects
            time_dt = datetime.strptime(time_str, '%H:%M')
            ref_dt = datetime.strptime(reference_time_str, '%H:%M')
            
            # Subtract threshold minutes from reference
            ref_dt_with_threshold = ref_dt - timedelta(minutes=threshold_minutes)
            
            # Compare
            return time_dt < ref_dt_with_threshold
        except Exception as e:
            if self.debug:
                logger.debug(f"Error in _is_time_earlier: {str(e)}")
            # If there's any error, return False
            return False

    def export_to_excel(self, processed_data, output_path=None):
        """
        Export the processed data to an Excel file compatible with the standard import format.
        
        Args:
            processed_data: DataFrame with processed punch data
            output_path: Path to save the Excel file, or None for auto-generated name
            
        Returns:
            Path to the saved Excel file
        """
        if processed_data is None or processed_data.empty:
            logger.error("No data to export")
            return None
        
        try:
            if output_path is None:
                # Generate output filename
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                output_path = f"processed_punch_data_{timestamp}.xlsx"
            
            # Save to Excel
            processed_data.to_excel(output_path, index=False)
            logger.info(f"Exported processed data to {output_path}")
            
            return output_path
        
        except Exception as e:
            logger.error(f"Error exporting data to Excel: {str(e)}")
            return None
    
    def import_to_database(self, processed_data, db_path=None):
        """
        Import the processed punch data directly to the database.
        
        Args:
            processed_data: DataFrame with processed punch data
            db_path: Path to the database file
            
        Returns:
            Tuple of (employees_added, records_added) counts
        """
        if processed_data is None or processed_data.empty:
            logger.error("No data to import to database")
            return 0, 0
        
        try:
            # Initialize database - with proper handling of None
            if db_path:
                db = AttendanceDatabase(db_path)
            else:
                db = AttendanceDatabase()  # Use default path
            
            # Convert to Excel file first, then use the standard import method
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            temp_excel = f"temp_punch_import_{timestamp}.xlsx"
            
            processed_data.to_excel(temp_excel, index=False)
            
            # Use the standard import method
            employees_added, records_added = db.import_from_excel(temp_excel)
            
            # Clean up temp file
            try:
                os.remove(temp_excel)
            except:
                pass
            
            logger.info(f"Imported {records_added} records for {employees_added} employees to database")
            return employees_added, records_added
        
        except Exception as e:
            logger.error(f"Error importing data to database: {str(e)}")
            if self.debug:
                import traceback
                logger.debug(traceback.format_exc())
            return 0, 0

# Command line interface
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Process punch record Excel files')
    parser.add_argument('file', help='Path to punch record Excel file')
    parser.add_argument('--output', '-o', help='Output Excel file path')
    parser.add_argument('--import-db', '-i', action='store_true', help='Import directly to database')
    parser.add_argument('--db-path', help='Path to database file')
    parser.add_argument('--debug', '-d', action='store_true', help='Enable debug output')
    
    args = parser.parse_args()
    
    processor = PunchRecordProcessor(debug=args.debug)
    processed_data = processor.process_file(args.file)
    
    if processed_data is None:
        sys.exit(1)
    
    if args.import_db:
        # Import directly to database
        db_path = args.db_path if args.db_path else DATABASE_FILE
        employees_added, records_added = processor.import_to_database(processed_data, db_path)
        print(f"Successfully imported {records_added} records for {employees_added} employees to database")
    else:
        # Export to Excel
        output_path = args.output if args.output else None
        output_file = processor.export_to_excel(processed_data, output_path)
        if output_file:
            print(f"Processed data exported to {output_file}")
            print("To import to the database, run:")
            print(f"python init_db.py --import {output_file}")
        else:
            print("Failed to export data")
            sys.exit(1)
