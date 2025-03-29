#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
check_command() {
  if ! command -v $1 &> /dev/null; then
    echo -e "${RED}$1 is not installed. Please install it before continuing.${NC}"
    return 1
  else
    echo -e "${GREEN}$1 is installed: $(command -v $1)${NC}"
    return 0
  fi
}

# Function to check environment setup
check_env() {
  if [ ! -f iceplant_portal/.env ]; then
    echo -e "${YELLOW}Environment file not found. Creating from example...${NC}"
    cp iceplant_portal/.env.example iceplant_portal/.env
    echo -e "${GREEN}Created .env file. Please check and update the values if needed.${NC}"
  else
    echo -e "${GREEN}Environment file exists.${NC}"
  fi
}

# Check all dependencies
check_dependencies() {
  echo "Checking dependencies..."
  
  local all_good=0
  
  # Check Python
  if ! check_command python3; then
    all_good=1
    echo -e "${RED}Please install Python 3.8+ from https://www.python.org/downloads/${NC}"
  else
    python_version=$(python3 --version | cut -d ' ' -f 2)
    echo -e "${GREEN}Python version: $python_version${NC}"
  fi
  
  # Check pip
  if ! check_command pip3; then
    all_good=1
    echo -e "${RED}Please install pip with Python${NC}"
  fi
  
  # Check Node.js
  if ! check_command node; then
    all_good=1
    echo -e "${RED}Please install Node.js from https://nodejs.org/${NC}"
  else
    node_version=$(node --version)
    echo -e "${GREEN}Node.js version: $node_version${NC}"
  fi
  
  # Check npm
  if ! check_command npm; then
    all_good=1
    echo -e "${RED}Please install npm with Node.js${NC}"
  else
    npm_version=$(npm --version)
    echo -e "${GREEN}npm version: $npm_version${NC}"
  fi
  
  # Check environment file
  check_env
  
  return $all_good
}

# Function to run the Django backend
run_backend() {
  echo -e "${GREEN}Starting Django backend...${NC}"
  cd iceplant_portal
  python3 -m venv venv 2>/dev/null || true
  if [ -f venv/bin/activate ]; then
    source venv/bin/activate
  elif [ -f venv/Scripts/activate ]; then
    source venv/Scripts/activate
  else
    echo -e "${YELLOW}Virtual environment not activated. Continuing anyway...${NC}"
  fi
  
  pip3 install -r requirements.txt
  python3 manage.py migrate
  python3 manage.py runserver 8000
}

# Function to run the React frontend
run_frontend() {
  echo -e "${GREEN}Starting React frontend...${NC}"
  cd iceplant_portal/frontend
  npm install
  npm run dev
}

# Function to run both backend and frontend concurrently
run_both() {
  echo -e "${GREEN}Starting both backend and frontend...${NC}"
  # Run in background and save PIDs
  run_backend & 
  BACKEND_PID=$!
  run_frontend &
  FRONTEND_PID=$!
  
  # Setup trap to kill both processes on exit
  trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
  
  # Wait for both processes
  wait $BACKEND_PID $FRONTEND_PID
}

# Help message
show_help() {
  echo "Usage: ./run.sh [backend|frontend|both]"
  echo "  backend  - Run only the Django backend"
  echo "  frontend - Run only the React frontend"
  echo "  both     - Run both backend and frontend (default)"
  echo "  check    - Only check dependencies without running"
}

# Main script logic
if [ "$1" = "check" ]; then
  check_dependencies
  exit $?
fi

# Check dependencies before running
check_dependencies
if [ $? -ne 0 ]; then
  echo -e "${RED}Please install missing dependencies before running the application.${NC}"
  exit 1
fi

case "$1" in
  backend)
    run_backend
    ;;
  frontend)
    run_frontend
    ;;
  both|"")
    run_both
    ;;
  *)
    show_help
    exit 1
    ;;
esac