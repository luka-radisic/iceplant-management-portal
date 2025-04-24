#!/usr/bin/env python3
import os
import sys
import argparse
import PyPDF2
import re
import file_utils

def extract_text(pdf_path, page_num=None):
    """Extract text from PDF file."""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            if page_num is not None:
                if 0 <= page_num < len(pdf_reader.pages):
                    return pdf_reader.pages[page_num].extract_text()
                else:
                    print(f"Page {page_num} is out of range. PDF has {len(pdf_reader.pages)} pages.")
                    return None
            else:
                # Return all text
                all_text = []
                for i in range(len(pdf_reader.pages)):
                    all_text.append(f"--- PAGE {i+1} ---\n")
                    page_text = pdf_reader.pages[i].extract_text()
                    all_text.append(page_text)
                    
                    # Look for date-time patterns to help suggest regex patterns
                    print(f"Analyzing page {i+1}...")
                    find_date_patterns(page_text)
                    
                return "\n".join(all_text)
    except Exception as e:
        print(f"Error reading PDF: {str(e)}")
        return None

def find_date_patterns(text):
    """Analyze text for potential date and time patterns."""
    # Common date formats
    date_patterns = [
        (r'\d{2}/\d{2}/\d{4}', "DD/MM/YYYY or MM/DD/YYYY"),
        (r'\d{2}-\d{2}-\d{4}', "DD-MM-YYYY or MM-DD-YYYY"),
        (r'\d{4}/\d{2}/\d{2}', "YYYY/MM/DD"),
        (r'\d{4}-\d{2}-\d{2}', "YYYY-MM-DD")
    ]
    
    # Time formats
    time_patterns = [
        (r'\d{2}:\d{2}', "HH:MM 24-hour"),
        (r'\d{1,2}:\d{2}\s*[AP]M', "HH:MM AM/PM 12-hour")
    ]
    
    found_dates = False
    found_times = False
    
    # Find date patterns
    for pattern, desc in date_patterns:
        matches = re.findall(pattern, text)
        if matches:
            found_dates = True
            print(f"Found {len(matches)} potential dates matching {desc} format: {matches[:3]} ...")
            
    # Find time patterns
    for pattern, desc in time_patterns:
        matches = re.findall(pattern, text)
        if matches:
            found_times = True
            print(f"Found {len(matches)} potential times matching {desc} format: {matches[:3]} ...")
    
    if found_dates and found_times:
        print("Suggested regex patterns based on findings:")
        for dp, ddesc in date_patterns:
            for tp, tdesc in time_patterns:
                if re.search(dp, text) and re.search(tp, text):
                    print(f"For {ddesc} with {tdesc}:")
                    print(f"  r\"({dp})\\s+({tp})\\s+({tp})\"")
                    
    if not found_dates and not found_times:
        print("No standard date or time patterns detected.")

def main():
    parser = argparse.ArgumentParser(description='Extract and analyze text from PDF files.')
    parser.add_argument('pdf_file', type=str, help='Path to the PDF file')
    parser.add_argument('--page', '-p', type=int, help='Specific page number (0-based)', default=None)
    parser.add_argument('--output', '-o', type=str, help='Output file for extracted text', default=None)
    parser.add_argument('--use-temp', '-t', action='store_true', 
                        help='Save output to temp directory if no output file specified')
    args = parser.parse_args()
    
    if not os.path.exists(args.pdf_file):
        print(f"Error: File {args.pdf_file} not found.")
        return 1
        
    text = extract_text(args.pdf_file, args.page)
    
    if text:
        if args.output:
            # If output file is specified, use it directly
            output_path = args.output
            use_temp = False
            if not os.path.isabs(output_path) and args.use_temp:
                # If it's a relative path and use-temp is enabled
                use_temp = True
        else:
            # No output specified, create a default filename
            output_path = f"{os.path.basename(args.pdf_file)}_analysis.txt"
            use_temp = args.use_temp
        
        if use_temp:
            file_path = file_utils.save_debug_text(text, output_path, in_temp_dir=True)
            print(f"Text saved to temporary file: {file_path}")
        else:
            with open(output_path, 'w', encoding='utf-8') as file:
                file.write(text)
            print(f"Text saved to {output_path}")
        
        # Print first 500 characters to console
        print("\nExtracted text sample:\n" + "-" * 40)
        print(text[:500] + ("..." if len(text) > 500 else ""))
        print("-" * 40)
        print(f"\nTotal length: {len(text)} characters")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
