#!/bin/bash
# Setup script for TimeAttendance Exporter on macOS/Linux

# Create and setup virtual environment
python3 setup_venv.py

# Check if virtual environment was created successfully
if [ $? -ne 0 ]; then
    echo "Error: Failed to set up virtual environment"
    exit 1
fi

# Prompt user to activate the environment
echo ""
echo "To activate the virtual environment and start the app, run:"
echo "source venv/bin/activate && python app.py"
