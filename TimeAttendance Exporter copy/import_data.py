#!/usr/bin/env python3
import os
import pandas as pd
import logging
from werkzeug.utils import secure_filename
from db_interface import AttendanceDatabase

logger = logging.getLogger(__name__)

def validate_file(filename, allowed_extensions=None):
    """
    Validate that the file has an allowed extension.
    
    Args:
        filename: The name of the file to validate
        allowed_extensions: Set of allowed file extensions (default: xlsx, xls, csv, pdf)
        
    Returns:
        bool: True if the file is valid, False otherwise
    """
    if allowed_extensions is None:
        allowed_extensions = {'xlsx', 'xls', 'csv', 'pdf'}
        
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def process_import_file(file, upload_folder):
    """
    Process an imported file and save it to the upload folder.
    
    Args:
        file: The file object from request.files
        upload_folder: Directory to save uploaded files
        
    Returns:
        tuple: (success, message, file_path) where success is a boolean,
               message is a status message, and file_path is the path to the saved file
    """
    if not file or file.filename == '':
        return False, "No file selected", None
        
    if not validate_file(file.filename):
        return False, "Invalid file type. Please upload Excel or PDF files only.", None
    
    try:
        # Save file with a secure name
        filename = secure_filename(file.filename)
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)
        return True, f"File {filename} uploaded successfully", file_path
    except Exception as e:
        logger.error(f"Error saving file: {str(e)}")
        return False, f"Error saving file: {str(e)}", None

def import_data_to_db(file_path, db_path=None):
    """
    Import data from file to database.
    
    Args:
        file_path: Path to the file to import
        db_path: Path to the database file (optional)
        
    Returns:
        tuple: (success, message, stats) where success is a boolean,
               message is a status message, and stats is a dict with import stats
    """
    if not os.path.exists(file_path):
        return False, f"File not found: {file_path}", None
    
    try:
        # Initialize database
        db = AttendanceDatabase(db_path)
        
        # Check file type and process accordingly
        file_ext = file_path.rsplit('.', 1)[1].lower()
        
        if file_ext == 'pdf':
            # For PDF files, we need to extract data first
            # This would normally import from attendance_parser.py
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
        else:
            # Direct import for Excel/CSV
            employees_added, records_added = db.import_from_excel(file_path)
        
        # Clean up the original file
        try:
            os.remove(file_path)
        except:
            logger.warning(f"Could not remove temporary file: {file_path}")
        
        stats = {
            "employees_added": employees_added,
            "records_added": records_added
        }
        
        return True, f"Successfully imported {records_added} records for {employees_added} employees", stats
        
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        return False, f"Error processing file: {str(e)}", None

# Command-line interface
if __name__ == "__main__":
    import argparse
    import sys
    
    # Set up logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    parser = argparse.ArgumentParser(description='Import attendance data from file')
    parser.add_argument('file', help='Path to the file to import')
    parser.add_argument('--db', help='Path to the database file (optional)')
    
    args = parser.parse_args()
    
    success, message, stats = import_data_to_db(args.file, args.db)
    print(message)
    
    if success:
        print(f"Employees added: {stats['employees_added']}")
        print(f"Records added: {stats['records_added']}")
        sys.exit(0)
    else:
        sys.exit(1)
