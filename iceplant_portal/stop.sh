#!/bin/bash

# Script to stop IcePlant Management Portal development servers

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Stopping all running development servers...${NC}"

# Find and kill Django runserver processes
DJANGO_PIDS=$(ps aux | grep "[p]ython.*runserver" | awk '{print $2}')
if [ -n "$DJANGO_PIDS" ]; then
    echo -e "${YELLOW}Stopping Django server(s)...${NC}"
    for pid in $DJANGO_PIDS; do
        echo -e "  Killing Django process with PID: ${RED}$pid${NC}"
        kill $pid 2>/dev/null
    done
    echo -e "${GREEN}Django server(s) stopped${NC}"
else
    echo -e "${YELLOW}No running Django server found${NC}"
fi

# Find and kill Vite (npm run dev) processes
VITE_PIDS=$(ps aux | grep "[n]ode.*vite.*dev" | awk '{print $2}')
if [ -n "$VITE_PIDS" ]; then
    echo -e "${YELLOW}Stopping Vite/frontend server(s)...${NC}"
    for pid in $VITE_PIDS; do
        echo -e "  Killing Vite process with PID: ${RED}$pid${NC}"
        kill $pid 2>/dev/null
    done
    echo -e "${GREEN}Vite/frontend server(s) stopped${NC}"
else
    echo -e "${YELLOW}No running Vite/frontend server found${NC}"
fi

echo -e "${GREEN}All development servers have been stopped${NC}" 