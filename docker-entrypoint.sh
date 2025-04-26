#!/bin/bash
# Activate virtual environment
source /app/venv/bin/activate

# Start Django backend
cd /app/iceplant_portal
python manage.py migrate
python manage.py runserver 0.0.0.0:8000 > /dev/stdout 2> /dev/stderr &

# Start frontend dev server
cd /app/iceplant_portal/frontend
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev &

wait