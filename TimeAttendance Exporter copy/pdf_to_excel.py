import os
import re
try:
    import tkinter as tk
    from tkinter import filedialog, messagebox
    HAS_TKINTER = True
except ImportError:
    HAS_TKINTER = False
    print("Warning: tkinter is not installed. GUI features will be disabled.")
    print("To install tkinter:")
    print("  - For macOS with Homebrew: brew reinstall python-tk")
    print("  - For macOS with Python.org installer: Reinstall Python from python.org")
    print("Continuing with command-line mode...")

try:
    import PyPDF2
except ImportError:
    print("PyPDF2 not found. Installing...")
    import subprocess
    subprocess.check_call(["pip", "install", "PyPDF2"])
    import PyPDF2

import pandas as pd
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s',
                    handlers=[logging.StreamHandler()])
logger = logging.getLogger(__name__)

def select_pdf_file():
    """Open file dialog to select PDF file if tkinter is available."""
    if HAS_TKINTER:
        root = tk.Tk()
        root.withdraw()  # Hide the root window
        file_path = filedialog.askopenfilename(
            title="Select PDF File",
            filetypes=[("PDF files", "*.pdf")]
        )
        return file_path
    else:
        return None

def get_pdf_text(pdf_path, page_num=None):
    """Extract raw text from PDF for debugging purposes."""
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        
        if page_num is not None and 0 <= page_num < len(pdf_reader.pages):
            return pdf_reader.pages[page_num].extract_text()
        else:
            all_text = []
            for i in range(len(pdf_reader.pages)):
                all_text.append(f"--- PAGE {i+1} ---\n")
                all_text.append(pdf_reader.pages[i].extract_text())
            return "\n".join(all_text)

def parse_atlantis_attendance_card(text, pdf_filename, debug=False):
    """
    Parse the specific format used by Atlantis Fishing Development Corp attendance cards.
    This format has blocks of employee data with dates, days, and times.
    """
    data = []
    
    # First extract the report period if available
    report_period_match = re.search(r"From\s+(\d{4}/\d{2}/\d{2})\s+to\s+(\d{4}/\d{2}/\d{2})", text)
    report_start_date = report_end_date = None
    
    if report_period_match:
        report_start_date = report_period_match.group(1)
        report_end_date = report_period_match.group(2)
        if debug:
            logger.info(f"Report period: {report_start_date} to {report_end_date}")
    
    # Split the text into employee blocks
    # Each block starts with "Full Name" or "Employee No."
    employee_blocks = re.split(r"Full Name\s+Employee No\.", text)
    
    # Skip the first element which is usually the header
    if len(employee_blocks) > 1:
        employee_blocks = employee_blocks[1:]
    
    if debug:
        logger.info(f"Found {len(employee_blocks)} potential employee blocks")
    
    # Process each employee block
    for i, block in enumerate(employee_blocks):
        if not block.strip():
            continue
            
        if debug:
            logger.info(f"Processing employee block {i+1}")
            
        # Extract employee name and ID
        employee_match = re.search(r"^\s*([^\n]+?)\s*\n\s*(\d+)", block.strip())
        if not employee_match:
            if debug:
                logger.warning(f"Could not find employee info in block {i+1}")
            continue
            
        employee_name = employee_match.group(1).strip()
        employee_id = employee_match.group(2).strip()
        
        if debug:
            logger.info(f"Found employee: {employee_name} (ID: {employee_id})")
        
        # Extract all dates from this section
        dates = re.findall(r"(20\d{2}-\d{2}-\d{2})", block)
        days = re.findall(r"\n([A-Za-z]+\.)\s*\n", block)
        
        # Extract the required work hours
        required_times = re.findall(r"\n(\d{2}:\d{2}-\d{2}:\d{2})\s*\n", block)
        
        # Find actual attendance times - note the special format
        # This includes both normal times (08:14-17:07) and absent (0.00-0.00)
        actual_times = []
        for line in block.split('\n'):
            # Look for time patterns at the beginning of lines
            time_match = re.match(r"^((?:\d{1,2}:\d{2}-\d{1,2}:\d{2})|(?:0\.00-0\.00)|(?:\d{1,2}:\d{2}-0\.00))", line.strip())
            if time_match:
                actual_times.append(time_match.group(1))
        
        if debug:
            logger.info(f"Found {len(dates)} dates, {len(days)} days, {len(required_times)} required times, {len(actual_times)} actual times")
        
        # Now match up the data
        # We expect dates, days, required_times, and actual_times to have similar lengths
        min_length = min(len(dates), len(days), len(required_times), len(actual_times))
        if min_length == 0:
            if debug:
                logger.warning(f"Insufficient data for employee {employee_name}")
            continue
        
        # Create records for each date
        for j in range(min_length):
            date = dates[j]
            day = days[j] if j < len(days) else ""
            required_time = required_times[j] if j < len(required_times) else ""
            actual_time = actual_times[j] if j < len(actual_times) else "0.00-0.00"
            
            # Parse actual time in and out
            if actual_time != "0.00-0.00" and "-0.00" not in actual_time:
                try:
                    time_in, time_out = actual_time.split('-')
                except ValueError:
                    time_in, time_out = "0:00", "0:00"
            else:
                time_in, time_out = "0:00", "0:00"  # Absent
            
            record = {
                'Employee Name': employee_name,
                'Employee ID': employee_id,
                'Date': date,
                'Day': day,
                'Required Time': required_time,
                'Time In': time_in,
                'Time Out': time_out,
                'Actual Time': actual_time,
                'Status': 'Present' if actual_time != "0.00-0.00" and "-0.00" not in actual_time else 'Absent',
                'Source': os.path.basename(pdf_filename),
                'Report Period': f"{report_start_date} to {report_end_date}" if report_start_date else ""
            }
            
            data.append(record)
            
            if debug and j < 3:  # Show only first 3 records to avoid log clutter
                logger.info(f"  - Record: {date} ({day}): {actual_time}")
    
    return data

def extract_data_from_pdf(pdf_path, debug=False):
    """Extract attendance data from the PDF file."""
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    data = []
    
    # Open and read the PDF file
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        
        if debug:
            logger.info(f"PDF has {len(pdf_reader.pages)} pages")
        
        # Extract text from all pages
        full_text = ""
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            page_text = page.extract_text()
            full_text += page_text
            
            # If in debug mode, save raw text from each page
            if debug:
                debug_filename = f"{os.path.basename(pdf_path)}_page{page_num+1}_debug.txt"
                with open(debug_filename, "w", encoding="utf-8") as debug_file:
                    debug_file.write(page_text)
                logger.info(f"Saved raw text from page {page_num+1} to {debug_filename}")
        
        # First try the specialized Atlantis Fishing format parser
        atlantis_data = parse_atlantis_attendance_card(full_text, pdf_path, debug)
        
        if atlantis_data:
            data.extend(atlantis_data)
            if debug:
                logger.info(f"Successfully parsed {len(atlantis_data)} records using Atlantis format parser")
        else:
            # Fall back to other parsers
            if debug:
                logger.info("Atlantis format parser didn't find data, trying alternative parsers")
            
            # Try page by page with other parsers
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                
                # Try generic parsers
                page_data = parse_attendance_card(text, debug)
                
                if page_data:
                    data.extend(page_data)
                    if debug:
                        logger.info(f"Found {len(page_data)} records on page {page_num+1} using generic parser")
                else:
                    # Try pattern-based fallbacks
                    if debug:
                        logger.info(f"No records found with generic parser, trying pattern matching on page {page_num+1}")
                    
                    patterns = [
                        r"(\d{4}-\d{2}-\d{2})[\s\n]+((?:[A-Za-z]+\.))[\s\n]+((?:\d{2}:\d{2}-\d{2}:\d{2}))[\s\n]+((?:\d{2}:\d{2}-\d{2}:\d{2}|0\.00-0\.00))",
                        r"(20\d{2}-\d{2}-\d{2})[\s\n]+((?:\d{2}:\d{2}-\d{2}:\d{2}))",
                        r"(20\d{2}/\d{2}/\d{2})[\s\n]+((?:\d{2}:\d{2}-\d{2}:\d{2}))",
                    ]
                    
                    for pattern in patterns:
                        matches = re.finditer(pattern, text)
                        page_data = []
                        
                        for match in matches:
                            if len(match.groups()) >= 2:
                                date = match.group(1)
                                # Handle different group arrangements
                                if len(match.groups()) >= 4:
                                    day = match.group(2)
                                    required = match.group(3)
                                    actual = match.group(4)
                                    time_parts = actual.split('-')
                                else:
                                    time_str = match.group(2)
                                    time_parts = time_str.split('-')
                                    day = ""
                                    required = ""
                                    actual = time_str
                                
                                # Get time in and out
                                if len(time_parts) == 2 and time_parts[0] != "0.00":
                                    time_in, time_out = time_parts
                                else:
                                    time_in, time_out = "0:00", "0:00"
                                
                                record = {
                                    'Date': date,
                                    'Day': day if len(match.groups()) >= 4 else "",
                                    'Required Time': required if len(match.groups()) >= 4 else "",
                                    'Time In': time_in,
                                    'Time Out': time_out,
                                    'Actual Time': actual,
                                    'Source': os.path.basename(pdf_path),
                                    'Page': page_num + 1
                                }
                                page_data.append(record)
                        
                        if page_data:
                            data.extend(page_data)
                            if debug:
                                logger.info(f"Found {len(page_data)} generic records on page {page_num+1} using pattern: {pattern}")
                            # Break out of the pattern loop if we found matches
                            break
                    
                    if not page_data and debug:
                        logger.info(f"No matching records found on page {page_num+1}")
    
    return data

def parse_attendance_card(text, debug=False):
    """
    Parse attendance card format from the extracted PDF text.
    This is the original parser for simpler formats.
    """
    data = []
    
    # Extract employee information - looking for "Employee No." followed by name and ID
    employee_pattern = r"Employee No\.[\s\n]+(.*?)[\s\n]+(\d+)"
    employee_matches = re.finditer(employee_pattern, text)
    
    for employee_match in employee_matches:
        employee_name = employee_match.group(1).strip()
        employee_id = employee_match.group(2).strip()
        
        if debug:
            logger.info(f"Found employee: {employee_name} (ID: {employee_id})")
        
        # Find dates and corresponding times
        # This looks for YYYY-MM-DD followed eventually by day abbreviation and time patterns
        date_pattern = r"(20\d{2}-\d{2}-\d{2})[\s\n]+([a-zA-Z]+\.)[\s\n]+((?:\d{2}:\d{2}-\d{2}:\d{2}))[\s\n]+((?:\d{1,2}:\d{2}-\d{1,2}:\d{2}|0\.00-0\.00))"
        date_matches = re.finditer(date_pattern, text)
        
        for date_match in date_matches:
            date = date_match.group(1).strip()
            day_of_week = date_match.group(2).strip()
            required_time = date_match.group(3).strip()
            actual_time = date_match.group(4).strip()
            
            # Parse actual time in and out
            if actual_time != "0.00-0.00":
                try:
                    time_in, time_out = actual_time.split('-')
                except ValueError:
                    time_in, time_out = "0:00", "0:00"
            else:
                time_in, time_out = "0:00", "0:00"  # Absent
            
            record = {
                'Employee Name': employee_name,
                'Employee ID': employee_id,
                'Date': date,
                'Day': day_of_week,
                'Required Time': required_time,
                'Time In': time_in,
                'Time Out': time_out,
                'Actual Time': actual_time,
                'Status': 'Present' if actual_time != "0.00-0.00" else 'Absent'
            }
            
            data.append(record)
            
            if debug:
                logger.info(f"  - Record: {date} ({day_of_week}): {actual_time}")
    
    return data

def main():
    if HAS_TKINTER:
        # Create a simple GUI for selecting directories and files
        root = tk.Tk()
        root.title("PDF to Excel Converter")
        root.geometry("500x300")
        root.withdraw()  # Hide the main window
        
        # Select PDF directory
        pdf_directory = filedialog.askdirectory(title="Select directory containing PDF files")
        if not pdf_directory:
            messagebox.showerror("Error", "No directory selected. Exiting...")
            return
        
        # Select output Excel file
        default_filename = f"time_attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        output_excel = filedialog.asksaveasfilename(
            title="Save Excel file as",
            defaultextension=".xlsx",
            initialfile=default_filename,
            filetypes=[("Excel files", "*.xlsx"), ("All files", "*.*")]
        )
        if not output_excel:
            messagebox.showerror("Error", "No output file selected. Exiting...")
            return
        
        try:
            # Process PDF files
            all_data = []
            pdf_files = [f for f in os.listdir(pdf_directory) if f.lower().endswith('.pdf')]
            
            if not pdf_files:
                messagebox.showwarning("Warning", "No PDF files found in the selected directory.")
                return
                
            for filename in pdf_files:
                pdf_path = os.path.join(pdf_directory, filename)
                try:
                    data = extract_data_from_pdf(pdf_path, debug=True)
                    all_data.extend(data)
                except Exception as e:
                    messagebox.showwarning("Warning", f"Error processing {filename}: {str(e)}")
                    
            if all_data:
                df = pd.DataFrame(all_data)
                df.to_excel(output_excel, index=False)
                messagebox.showinfo("Success", f"Data exported to {output_excel}")
            else:
                messagebox.showwarning("Warning", "No data was extracted from the PDF files.")
        except Exception as e:
            messagebox.showerror("Error", f"An error occurred: {str(e)}")
    else:
        print("Please specify a PDF file path when running as a script without tkinter.")

if __name__ == '__main__':
    main()
