#!/bin/bash

# Script to start IcePlant Management Portal development environment
# Created: $(date +"%Y-%m-%d")

# Set the base directory to the script's location
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$SCRIPT_DIR/iceplant_portal"

echo "Project root directory: $SCRIPT_DIR"
echo "Application directory: $APP_DIR"

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for debug mode
DEBUG=0
if [ "$1" == "--debug" ]; then
    DEBUG=1
    echo -e "${YELLOW}Debug mode enabled${NC}"
fi

# Navigate to the application directory
cd "$APP_DIR" || { echo -e "${RED}Failed to navigate to application directory${NC}"; exit 1; }
echo -e "${GREEN}Changed directory to: $(pwd)${NC}"

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check for Python
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    # Check if python is Python 3
    PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}' | cut -d. -f1)
    if [ "$PYTHON_VERSION" == "3" ]; then
        PYTHON_CMD="python"
    else
        echo -e "${RED}Python 3 is required but not found. Please install Python 3.${NC}"
        exit 1
    fi
else
    echo -e "${RED}Python 3 is not installed. Please install Python 3.${NC}"
    exit 1
fi

echo -e "${GREEN}Using Python command: $PYTHON_CMD${NC}"

# Check for Node.js
if ! command -v node &>/dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js.${NC}"
    exit 1
fi

# Check for npm
if ! command -v npm &>/dev/null; then
    echo -e "${RED}npm is not installed. Please install npm.${NC}"
    exit 1
fi

# Check if virtual environment exists, create if it doesn't
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Virtual environment not found. Creating one...${NC}"
    $PYTHON_CMD -m venv venv
fi

# Function to activate virtual environment
activate_venv() {
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
    elif [ -f "venv/Scripts/activate" ]; then
        source venv/Scripts/activate
    else
        echo -e "${RED}Failed to find activate script in the virtual environment.${NC}"
        exit 1
    fi
}

# Activate virtual environment
echo -e "${BLUE}Activating virtual environment...${NC}"
activate_venv

# Verify activation worked
if [[ "$VIRTUAL_ENV" != *"venv"* ]]; then
    echo -e "${RED}Failed to activate virtual environment.${NC}"
    echo -e "${YELLOW}Trying to proceed anyway...${NC}"
fi

# Install Python dependencies if needed
if [ ! -f "requirements.installed" ]; then
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    pip install -r requirements.txt
    touch requirements.installed
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend && npm install
    cd .. # Return to app directory
fi

# Check for and create pending migrations
echo -e "${BLUE}Checking for pending migrations...${NC}"
MIGRATION_CHECK=$(python manage.py showmigrations | grep -B1 "\[ \]" | grep -v "\[ \]" | grep -v -- "--" | awk '{print $1}' | tr '\n' ' ')

if [ -n "$MIGRATION_CHECK" ]; then
    echo -e "${YELLOW}Found pending migrations. Applying them...${NC}"
    python manage.py migrate
fi

# Check for model changes not reflected in migrations
echo -e "${BLUE}Checking for model changes not in migrations...${NC}"
MAKEMIGRATIONS_OUTPUT=$(python manage.py makemigrations --check 2>&1)
if echo "$MAKEMIGRATIONS_OUTPUT" | grep -q "Your models have changes that are not yet reflected"; then
    echo -e "${YELLOW}Model changes detected. Creating new migrations...${NC}"
    python manage.py makemigrations
    
    # Apply the new migrations
    echo -e "${BLUE}Applying new migrations...${NC}"
    python manage.py migrate
else
    echo -e "${GREEN}No model changes detected.${NC}"
fi

# Start Django server in the background
echo -e "${GREEN}Starting Django backend server...${NC}"
python manage.py runserver 8000 &
DJANGO_PID=$!
echo -e "${GREEN}Django server started with PID: $DJANGO_PID${NC}"

# Small delay to let Django start
sleep 2

# Check if Django server started successfully
if ! ps -p $DJANGO_PID > /dev/null; then
    echo -e "${RED}Django server failed to start. Check logs above for errors.${NC}"
    exit 1
fi

# Start frontend development server with increased memory limit
echo -e "${GREEN}Starting React frontend development server...${NC}"
cd frontend
# Use NODE_OPTIONS to increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
# Start npm in a more resilient way
npm run dev &
FRONTEND_PID=$!
cd .. # Return to app directory
echo -e "${GREEN}Frontend server started with PID: $FRONTEND_PID${NC}"

# Small delay to let frontend server start
sleep 3

# Check if frontend server started successfully
if ! ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${RED}Frontend server failed to start. Check logs above for errors.${NC}"
    kill $DJANGO_PID
    exit 1
fi

# Create a trap to catch Ctrl+C and kill both servers
trap 'echo -e "${YELLOW}Shutting down servers...${NC}"; kill $DJANGO_PID 2>/dev/null; kill $FRONTEND_PID 2>/dev/null; exit' INT

# Keep the script running
echo -e "${GREEN}Both servers are running. Press Ctrl+C to stop all servers.${NC}"
echo -e "${BLUE}Django admin available at: ${GREEN}http://127.0.0.1:8000/admin/${NC}"
echo -e "${BLUE}Frontend available at: ${GREEN}http://localhost:5173/${NC}"

# If debug mode is enabled, show the PIDs and memory usage
if [ $DEBUG -eq 1 ]; then
    echo -e "${YELLOW}DEBUG: Django server PID: $DJANGO_PID${NC}"
    echo -e "${YELLOW}DEBUG: Frontend server PID: $FRONTEND_PID${NC}"
    
    # Monitor memory usage periodically
    while true; do
        sleep 60
        DJANGO_MEM=$(ps -o rss= -p $DJANGO_PID 2>/dev/null)
        FRONTEND_MEM=$(ps -o rss= -p $FRONTEND_PID 2>/dev/null)
        
        if [ -n "$DJANGO_MEM" ]; then
            DJANGO_MEM_MB=$((DJANGO_MEM / 1024))
            echo -e "${YELLOW}DEBUG: Django server memory usage: ${DJANGO_MEM_MB}MB${NC}"
        fi
        
        if [ -n "$FRONTEND_MEM" ]; then
            FRONTEND_MEM_MB=$((FRONTEND_MEM / 1024))
            echo -e "${YELLOW}DEBUG: Frontend server memory usage: ${FRONTEND_MEM_MB}MB${NC}"
        fi
    done &
    MONITOR_PID=$!
    trap 'echo -e "${YELLOW}Shutting down servers...${NC}"; kill $DJANGO_PID 2>/dev/null; kill $FRONTEND_PID 2>/dev/null; kill $MONITOR_PID 2>/dev/null; exit' INT
fi

# Wait indefinitely (until Ctrl+C)
wait 