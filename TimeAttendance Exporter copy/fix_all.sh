#!/bin/bash
# Script to fix all issues in TimeAttendance Exporter

echo "TimeAttendance Exporter - Fixing all issues"
echo "=========================================="

# Make scripts executable
echo "Setting script permissions..."
chmod +x /Users/luka/TimeAttendance\ Exporter/setup.sh
chmod +x /Users/luka/TimeAttendance\ Exporter/fix_imports.sh
chmod +x /Users/luka/TimeAttendance\ Exporter/fix_init_db.sh

# Fix any remaining AttendanceDB references
echo "Fixing AttendanceDB references..."
find . -name "*.py" -type f -exec sed -i '' 's/from db_interface import AttendanceDB/from db_interface import AttendanceDatabase/g' {} \;
find . -name "*.py" -type f -exec sed -i '' 's/AttendanceDB(/AttendanceDatabase(/g' {} \;
find . -name "*.py" -type f -exec sed -i '' 's/db = AttendanceDB/db = AttendanceDatabase/g' {} \;

# Fix inaccurately formatted requirements.txt
echo "Fixing requirements.txt format..."
sed -i '' 's/\/\/ filepath:/# filepath:/g' /Users/luka/TimeAttendance\ Exporter/requirements.txt

# Run fix_database to ensure database structure is correct
echo "Fixing database structure..."
python fix_database.py

echo "=========================================="
echo "All fixes have been applied!"
echo ""
echo "You can now run the application with:"
echo "1. python init_db.py      # Initialize the database first"
echo "2. python app.py          # Start the web application"
echo ""
echo "Or use the virtual environment with:"
echo "./setup.sh              # Setup virtual environment"
echo "source venv/bin/activate  # Activate it"
echo "python app.py             # Run the app"
