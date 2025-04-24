# Quick Start Guide for TimeAttendance Exporter

## First Run Setup

1. **Fix any issues in the codebase:**
   ```
   ./fix_all.sh
   ```

2. **Create a virtual environment and install dependencies:**
   ```
   ./setup.sh
   ```

3. **Activate the virtual environment:**
   ```
   source venv/bin/activate
   ```

4. **Create required directories:**
   ```
   mkdir -p uploads backups
   ```

5. **Initialize the database:**
   ```
   python init_db.py
   ```

6. **Start the application:**
   ```
   python app.py
   ```

7. **Access the app** in your browser at http://127.0.0.1:5000/

## Data Management

### Import Attendance Data

#### Standard Excel Format
1. Go to Import page
2. Upload Excel file with attendance data
3. Choose "Standard Format" (or Auto-Detect)
4. Click "Upload and Import Data"

#### Punch Record Files (NEW!)
1. Go to Import page
2. Upload Excel file with punch records
3. Choose "Punch Records" as import type
4. Click "Upload and Import Data"

**Note:** Punch record files contain multiple time entries per employee per day. The system will use the first punch as TIME IN and last punch as TIME OUT.

#### From Command Line
```bash
# For standard Excel files:
python init_db.py --import path/to/file.xlsx

# For punch record files:
python punch_record_importer.py path/to/file.xlsx --import-db

# For PDF files:
python attendance_parser.py path/to/file.pdf --output temp.xlsx
python init_db.py --import temp.xlsx
```

### Backup Your Data
1. Go to Admin > Database Management
2. Click "Manage Backups"
3. Choose backup type (Database Only or Full Backup)
4. Click "Create Backup"
5. Download the backup file for safekeeping

### Restore from Backup
1. Stop the application
2. Replace attendance.db with your backup file
   - For full backups, extract the zip and replace all files
3. Restart the application

## Troubleshooting Common Issues

### Import Errors
If you see `ImportError: cannot import name 'AttendanceDB'`:
```
./fix_imports.sh
```

### Missing Directories
If upload or backup fails:
```
mkdir -p uploads backups
chmod 755 uploads backups
```

### Database Errors
Fix database structure:
```
python fix_database.py
```

### Weekend Work Not Tracking Correctly
Run the weekend work fix script:
```
python fix_weekend_work.py
```

### Punch Record Import Issues
If punch record import is failing:
```
# Debug the punch record file
python punch_record_importer.py path/to/file.xlsx --debug

# Export processed data without importing
python punch_record_importer.py path/to/file.xlsx --output processed.xlsx
```

## Command Line Tools

### Database Backup
```
# Create database-only backup
python backup_utils.py --db-only

# Create full backup (database + uploads)
python backup_utils.py --full

# List available backups
python backup_utils.py --list
```

### Database Management
```
# View database statistics
python db_manager.py --stats

# Delete employee data
python db_manager.py --delete-employee EMPLOYEE_ID

# Delete date range
python db_manager.py --delete-range --start-date 2023-01-01 --end-date 2023-01-31
```

For more details, see the full README.md file.
