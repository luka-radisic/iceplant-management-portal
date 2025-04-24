#!/usr/bin/env python3
"""
Import handlers for different file types in TimeAttendance Exporter
"""
import os
import pandas as pd
import logging
from db_interface import AttendanceDatabase
from punch_record_importer import PunchRecordProcessor

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def detect_file_type(file_path):
    """
    Detect what type of import file this is.
    
    Returns:
        str: One of "punch_record", "standard_excel", "pdf", or "unknown"
    """
    try:
        # Check file extension
        ext = file_path.lower().split('.')[-1]
        
        if ext == 'pdf':
            return "pdf"
        
        if ext not in ['xlsx', 'xls']:
            return "unknown"
        
        # Check filename for known patterns
        filename = os.path.basename(file_path).lower()
        if "punch record report" in filename:
            return "punch_record"
        
        # Read Excel file to analyze its structure
        df = pd.read_excel(file_path)
        columns = [str(c).lower() for c in df.columns]
        column_set = set(columns)
        
        # Check for specific punch report format
        if {'time', 'user id', 'name', 'attendance event'}.issubset(column_set):
            return "punch_record"
        
        # Check if it's a generic punch record file
        punch_indicators = ['punch', 'check in', 'check out', 'clock in', 'clock out', 'time card', 'attendance event']
        if any(pi in ' '.join(columns) for pi in punch_indicators):
            return "punch_record"
            
        # Look for standard import format indicators
        standard_columns = ['employee name', 'employee id', 'date', 'status']
        if all(sc in ' '.join(columns) for sc in standard_columns):
            return "standard_excel"
        
        # If we can't determine for sure, default to auto
        return "auto"
        
    except Exception as e:
        logger.error(f"Error detecting file type: {str(e)}")
        return "unknown"

def import_file_to_db(file_path, db_path=None, import_type=None, auto_fill_gaps=False):
    """
    Import a file to the database.
    
    Args:
        file_path: Path to the file to import
        db_path: Path to the database file (optional)
        import_type: File type override: "punch_record", "standard_excel", or "pdf"
        auto_fill_gaps: Automatically fill missing days with No Work/Weekend status
        
    Returns:
        tuple: (success, message, stats)
    """
    if not os.path.exists(file_path):
        return False, f"File not found: {file_path}", None
    
    try:
        # Auto-detect file type if not specified
        if import_type is None:
            import_type = detect_file_type(file_path)
            logger.info(f"Detected file type: {import_type}")
        
        # Initialize database with proper path handling
        db = AttendanceDatabase(db_path if db_path is not None else None)
        
        # Handle different import types
        if import_type == "pdf":
            # Import from PDF attendance card
            from attendance_parser import AtlantisAttendanceParser
            
            parser = AtlantisAttendanceParser(debug=False)
            data = parser.parse_file(file_path)
            
            if not data:
                return False, "No data could be extracted from the PDF file", None
                
            # Save to temporary Excel file
            temp_excel = file_path.replace('.pdf', '_temp.xlsx')
            pd.DataFrame(data).to_excel(temp_excel, index=False)
            
            # Now import the Excel file
            employees_added, records_added = db.import_from_excel(temp_excel)
            
            # Clean up temp file
            try:
                os.remove(temp_excel)
            except:
                pass
                
        elif import_type == "punch_record":
            # Import from punch record Excel
            processor = PunchRecordProcessor(debug=True)  # Set debug to True for more insights
            processed_data = processor.process_file(file_path)
            
            if processed_data is None:
                return False, "Failed to process punch record data", None
                
            # Import processed data with safer db_path handling
            employees_added, records_added = processor.import_to_database(processed_data, db_path)
            
        else:  # standard_excel or fallback
            # Direct import for standard Excel
            employees_added, records_added = db.import_from_excel(file_path)
        
        stats = {
            "employees_added": employees_added,
            "records_added": records_added,
            "import_type": import_type,
            "gaps_filled": 0
        }
        
        # Fill missing workdays if requested
        if auto_fill_gaps and employees_added > 0:
            try:
                from app import fill_missing_workdays
                fill_stats = fill_missing_workdays()
                stats["gaps_filled"] = fill_stats['total_added']
                records_added += fill_stats['total_added']
                
                message = f"Successfully imported {records_added} records for {employees_added} employees (including {stats['gaps_filled']} automatically filled days)"
                return True, message, stats
            except Exception as e:
                logger.error(f"Error filling missing workdays: {str(e)}")
                # Continue even if gap filling fails - we still imported the data
        
        return True, f"Successfully imported {records_added} records for {employees_added} employees", stats
        
    except Exception as e:
        logger.error(f"Error importing file: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False, f"Error importing file: {str(e)}", None

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Import file to attendance database')
    parser.add_argument('file', help='Path to file to import')
    parser.add_argument('--type', choices=['punch_record', 'standard_excel', 'pdf', 'auto'],
                        default='auto', help='Type of file to import')
    parser.add_argument('--db-path', help='Path to database file')
    parser.add_argument('--auto-fill-gaps', action='store_true', help='Automatically fill missing days with No Work/Weekend status')
    
    args = parser.parse_args()
    
    file_type = args.type if args.type != 'auto' else None
    success, message, stats = import_file_to_db(args.file, args.db_path, file_type, args.auto_fill_gaps)
    
    print(message)
    
    if success and stats:
        print(f"Import type: {stats['import_type']}")
        print(f"Employees added: {stats['employees_added']}")
        print(f"Records added: {stats['records_added']}")
        if args.auto_fill_gaps:
            print(f"Gaps filled: {stats['gaps_filled']}")
