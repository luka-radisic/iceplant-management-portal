# TimeAttendance Exporter

A comprehensive system for tracking, analyzing, and managing employee attendance records. This application provides tools for importing attendance data from Excel files and PDFs, searching employee records, generating reports, and exporting data.

## Features

- **Employee Tracking**: Store and manage employee records
- **Attendance Records**: Track presence, absence, and work hours
- **Data Import**: Import attendance data from Excel files and PDF attendance cards
- **Punch Record Processing**: Convert time punch records to daily attendance data
- **Search Functionality**: Find employees and view their attendance records
- **Reporting Tools**: Generate customized attendance reports
- **Data Export**: Export records to Excel for further analysis
- **Database Management**: Administrative tools for database maintenance
- **Backup System**: Create and manage backups of your database and files

## Installation

### Prerequisites

- Python 3.7 or higher
- pip package manager

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/TimeAttendance-Exporter.git
   cd TimeAttendance\ Exporter
   ```

2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Initialize the database:
   ```bash
   python init_db.py
   ```

5. Create required folders:
   ```bash
   mkdir -p uploads backups
   ```

6. Run the fix scripts to ensure everything is properly configured:
   ```bash
   ./fix_all.sh  # On Windows: python fix_database.py
   ```

## Running the Application

Start the web interface:
```bash
python app.py
```

Then open your browser and navigate to:
```
http://127.0.0.1:5000/
```

For custom port or host:
```bash
python app.py --port 8080 --host 0.0.0.0
```

## Usage Guide

### Importing Data

#### Standard Excel Format

**Web Interface:**
1. Navigate to the Import page
2. Select an Excel file with attendance data
3. Select "Standard Format" as the import type (or use Auto-Detect)
4. Click "Import Data"

**Command Line:**
```bash
python init_db.py --import path/to/attendance_data.xlsx
```

Required Excel columns:
- Employee Name
- Employee ID
- Date
- Status (Present/Absent/Weekend)

Other recognized columns:
- Time In
- Time Out
- Day (e.g., Mon, Tue)
- Required Time
- Actual Time

#### From Punch Record Files

**Web Interface:**
1. Navigate to the Import page
2. Select an Excel file containing time punch records
3. Select "Punch Records" as the import type (or use Auto-Detect)
4. Click "Import Data"

**Command Line:**
```bash
python punch_record_importer.py path/to/punch_records.xlsx --import-db
```

Punch Record files typically contain multiple entries per employee per day:
- Employee ID/No.
- Employee Name
- Date
- Time of punch
- Type (In/Out) - optional

The system will process these records by taking the first punch as TIME IN and the last punch as TIME OUT for each day.

#### From PDF Attendance Cards

```bash
python attendance_parser.py path/to/attendance.pdf --output attendance_data.xlsx
```

Then import the generated Excel file using the methods above.

### Searching for Employees

1. Navigate to the Search page
2. Enter an employee name or ID in the search field
3. Click "Search"
4. View employee details by clicking on their entry in the results

### Viewing Employee Details

After finding an employee through search:
1. Click on "View Attendance" to see their detailed attendance records
2. Use the date filters to specify a time range
3. View summary statistics and daily records
4. Export data for this employee using the "Export" button

### Generating Reports

1. Navigate to the Reports page
2. Set filters by date range, employee name, or ID
3. Click "Generate Report" to view the filtered attendance data
4. Use "Export to Excel" to download the report as an Excel file

### Backing Up Your Data

#### Using the Web Interface
1. Log in to the application
2. Navigate to Admin Tools > Database Management
3. Click on "Manage Backups"
4. Choose a backup type:
   - Database Only: Just backs up the SQLite database
   - Full Backup: Includes database and uploads folder
5. Click "Create Backup"
6. Download the backup file for safekeeping

#### Using Command Line
```bash
# Create database-only backup
python backup_utils.py --db-only

# Create full backup (database + uploads)
python backup_utils.py --full

# List available backups
python backup_utils.py --list
```

#### Restoring from Backup
1. Stop the application
2. For database-only backup:
   - Replace the attendance.db file with your backup copy
3. For full backup:
   - Extract the zip file
   - Replace both attendance.db and the uploads folder
4. Restart the application

### Cleaning Data

For cleaning problematic Excel files:
```bash
python clean_excel.py path/to/excel_file.xlsx
```

Options:
- `--analyze` or `-a`: Only analyze without modifying the file
- `--output` or `-o`: Specify output file name

### Database Management

#### Web Interface

Navigate to `/admin/database` for database management options, including:
- Database statistics
- Database purge option (with confirmation)
- Backup management

#### Command Line

```bash
# View database statistics
python db_manager.py --stats

# Delete all data (with confirmation)
python db_manager.py --purge

# Delete a specific employee
python db_manager.py --delete-employee EMPLOYEE_ID

# Delete records in a date range
python db_manager.py --delete-range --start-date 2023-01-01 --end-date 2023-01-31
```

## Troubleshooting

### Common Issues

1. **Import Errors**: 
   - Ensure your Excel file has all required columns
   - Check for formatting issues with `clean_excel.py`

2. **Missing Dependencies**:
   - Verify all requirements are installed: `pip install -r requirements.txt`

3. **Database Issues**:
   - Reset the database: `python init_db.py --reset`
   - Fix database structure: `python fix_database.py`

4. **Missing Directories**:
   - Ensure both `uploads` and `backups` folders exist
   - Create them manually if needed: `mkdir -p uploads backups`

5. **Permission Issues**:
   - Make sure your user has write permissions to the application directory
   - For backup issues: `chmod -R 755 backups`

### Debug Mode

Run the app in debug mode for detailed logs:
```bash
python app.py --debug
```

## Analyzing PDF Files

To analyze PDF files before parsing:
```bash
python analyze_pdf.py path/to/file.pdf
```

This will extract text and show potential date and time patterns to help with parsing.

## Command Reference

| Command | Description |
|---------|-------------|
| `python app.py` | Start the web interface |
| `python init_db.py` | Initialize the database |
| `python init_db.py --import file.xlsx` | Import data from Excel file |
| `python punch_record_importer.py file.xlsx` | Process punch record file |
| `python init_db.py --reset` | Reset the database |
| `python db_manager.py --stats` | Display database statistics |
| `python db_manager.py --purge` | Delete all data from the database |
| `python clean_excel.py file.xlsx` | Clean and format Excel file |
| `python analyze_pdf.py file.pdf` | Analyze text in PDF file |
| `python attendance_parser.py file.pdf` | Parse attendance data from PDF |
| `python backup_utils.py --db-only` | Create database-only backup |
| `python backup_utils.py --full` | Create full backup (DB + uploads) |
| `python backup_utils.py --list` | List available backups |
| `./fix_all.sh` | Fix common issues automatically |

## File Structure

```
TimeAttendance Exporter/
├── app.py                  # Main Flask application
├── attendance_parser.py    # PDF parsing utility
├── analyze_pdf.py          # PDF analysis utility
├── backup_utils.py         # Database backup utilities
├── clean_excel.py          # Excel cleaning utility
├── data_cleaner.py         # Data cleaning library
├── date_utils.py           # Date manipulation utilities
├── db_interface.py         # Database interface
├── db_manager.py           # Database management utility
├── file_utils.py           # File handling utilities
├── import_handlers.py      # Import handler utilities
├── init_db.py              # Database initialization
├── punch_record_importer.py # Punch record processor
├── fix_database.py         # Database structure fix utility
├── fix_all.sh              # Fix script for common issues
├── requirements.txt        # Python dependencies
├── attendance.db           # SQLite database
├── backups/                # Directory for database backups
├── uploads/                # Directory for uploaded files
└── templates/              # HTML templates
    ├── admin/              # Admin templates
    │   ├── backup.html     # Backup management page
    │   └── database.html   # Database management page
    ├── base.html           # Base template
    ├── employee_detail.html # Employee details
    ├── import.html         # Import data page
    ├── index.html          # Home page
    ├── report.html         # Reporting page
    └── search.html         # Search page
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
