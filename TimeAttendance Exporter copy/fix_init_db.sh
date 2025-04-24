#!/bin/bash

echo "Fixing AttendanceDB reference in init_db.py..."

# Create backup
cp /Users/luka/TimeAttendance\ Exporter/init_db.py /Users/luka/TimeAttendance\ Exporter/init_db.py.bak

# Fix the reference directly using sed
sed -i '' 's/db_path = AttendanceDB()/db_path = AttendanceDatabase()/g' /Users/luka/TimeAttendance\ Exporter/init_db.py

echo "Fix applied. Please try running python init_db.py again."
echo "A backup was saved to init_db.py.bak"
