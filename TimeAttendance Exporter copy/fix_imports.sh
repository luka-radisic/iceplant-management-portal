#!/bin/bash
# Script to fix AttendanceDB import references

echo "Fixing import references in Python files..."

# Find all Python files and replace AttendanceDB with AttendanceDatabase
find . -name "*.py" -type f -exec sed -i '' 's/from db_interface import AttendanceDB/from db_interface import AttendanceDatabase/g' {} \;
find . -name "*.py" -type f -exec sed -i '' 's/AttendanceDB(/AttendanceDatabase(/g' {} \;
find . -name "*.py" -type f -exec sed -i '' 's/db = AttendanceDB/db = AttendanceDatabase/g' {} \;

echo "Import references fixed. Please try running the app again."
