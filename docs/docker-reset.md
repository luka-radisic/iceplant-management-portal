# Docker Reset and Clean Start

Follow these steps to completely reset and start fresh with your Docker setup:

## Step 1: Clean Up Docker Environment

```bash
# Remove all stopped containers
docker rm $(docker ps -a -q) || true

# Remove any dangling containers
docker container prune -f

# Remove unused volumes
docker volume prune -f

# Clear Docker Compose cache
rm -rf ~/.docker/compose/
```

## Step 2: Run With Simplified Configuration

```bash
# Start with the simplified docker-compose.yml
docker-compose up -d
```

## Step 3: Manually Set Up Persistent Storage

After the container is running:

```bash
# Connect to the container
docker exec -it iceplant-app bash

# Create data directory
mkdir -p /app/iceplant_portal/data

# If there's an existing database, move it
if [ -f /app/iceplant_portal/db.sqlite3 ]; then
    cp /app/iceplant_portal/db.sqlite3 /app/iceplant_portal/data/
    echo "Database copied to data directory"
fi

# Update the Django settings to use the new database location
cd /app/iceplant_portal/iceplant_core
cat > /tmp/update_settings.py << 'EOF'
import os

# Read the settings file
with open('settings.py', 'r') as f:
    content = f.read()

# Update database path
if "NAME': BASE_DIR / 'db.sqlite3'" in content:
    content = content.replace(
        "NAME': BASE_DIR / 'db.sqlite3'",
        "NAME': BASE_DIR / 'data' / 'db.sqlite3'"
    )
    
    with open('settings.py', 'w') as f:
        f.write(content)
    print("Database path updated")

# Update ALLOWED_HOSTS if needed
if "ALLOWED_HOSTS = ['localhost', '127.0.0.1', '146.190.201.119']" in content:
    content = content.replace(
        "ALLOWED_HOSTS = ['localhost', '127.0.0.1', '146.190.201.119']",
        "ALLOWED_HOSTS = ['localhost', '127.0.0.1', '146.190.201.119', 'cma.atlantis-fishing.com']"
    )
    
    with open('settings.py', 'w') as f:
        f.write(content)
    print("ALLOWED_HOSTS updated")
EOF

python /tmp/update_settings.py

# Restart Django
cd /app/iceplant_portal
pkill -f runserver
python manage.py runserver 0.0.0.0:8000 &

# Exit the container
exit
```

This approach avoids Docker volume mount issues while still allowing you to get your application running. After everything is stable, you can consider reintroducing proper volume mounts.
