#!/bin/bash

# Setup Persistent Storage for IcePlant Portal
# This script configures the Docker container to use persistent storage

# First stop any running container
echo "Stopping current containers..."
docker-compose down

# Start the container with the new volume configuration
echo "Starting container with persistent storage volumes..."
docker-compose up -d

# Wait for the container to fully start
echo "Waiting for container to start..."
sleep 5

# Create the data directory and move the database
echo "Setting up database in persistent storage..."
docker exec -it iceplant-app bash -c "
# Create data directory
mkdir -p /app/iceplant_portal/data

# Copy existing database if it exists
if [ -f /app/iceplant_portal/db.sqlite3 ]; then
    cp /app/iceplant_portal/db.sqlite3 /app/iceplant_portal/data/
    echo 'Copied existing database to data directory'
fi

# Update Django settings to use the new database location
cd /app/iceplant_portal
python -c \"
import re
with open('iceplant_core/settings.py', 'r') as f:
    content = f.read()
if \\\"NAME': BASE_DIR / 'db.sqlite3'\\\" in content:
    content = content.replace(
        \\\"NAME': BASE_DIR / 'db.sqlite3'\\\",
        \\\"NAME': BASE_DIR / 'data' / 'db.sqlite3'\\\"
    )
    with open('iceplant_core/settings.py', 'w') as f:
        f.write(content)
    print('Updated database path in settings.py')
else:
    print('Could not find database path in settings.py')
\"

# Restart Django to use the new database
pkill -f runserver
python manage.py runserver 0.0.0.0:8000 &
"

echo "Persistent storage setup complete!"
echo "Your data will now be stored in Docker volumes and persist between container restarts."
echo ""
echo "To verify:"
echo "1. Access your application at http://146.190.201.119:8000/admin/"
echo "2. Make some changes (create users, add data, etc.)"
echo "3. Restart the container with 'docker-compose restart'"
echo "4. Verify your changes are still there"
