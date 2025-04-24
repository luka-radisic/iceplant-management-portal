# Database Setup for Docker Persistent Storage

After running your container with the fixed docker-compose.yml, you need to:

1. **Create the data directory and move the database:**

```bash
# Connect to the running container
docker exec -it iceplant-app bash

# Inside the container, create data directory
mkdir -p /app/iceplant_portal/data

# If a database exists already, move it to the data directory
if [ -f /app/iceplant_portal/db.sqlite3 ]; then
    cp /app/iceplant_portal/db.sqlite3 /app/iceplant_portal/data/
    echo "Moved existing database to data directory"
fi

# Create a script to update the database location in settings.py
cat > /tmp/update_db_path.py << 'EOF'
import os

# Read the settings file
settings_file = '/app/iceplant_portal/iceplant_core/settings.py'
with open(settings_file, 'r') as f:
    content = f.read()

# Look for the DATABASES setting
if "NAME': BASE_DIR / 'db.sqlite3'" in content:
    # Replace it with the new path
    content = content.replace(
        "NAME': BASE_DIR / 'db.sqlite3'",
        "NAME': BASE_DIR / 'data' / 'db.sqlite3'"
    )
    
    # Write the updated content back
    with open(settings_file, 'w') as f:
        f.write(content)
    print("Updated database path in settings.py")
else:
    print("Could not find database path in settings.py")
EOF

# Run the script to update the settings
python /tmp/update_db_path.py

# Restart Django to use the new database location
cd /app/iceplant_portal
pkill -f runserver
python manage.py runserver 0.0.0.0:8000 &

# Exit the container
exit
```

2. **Verify the setup is working:**

```bash
# Check if the container is running correctly
docker ps

# Check the logs for any errors
docker logs iceplant-app
```

Now your database will persist in the iceplant_data volume even when the container is recreated.
