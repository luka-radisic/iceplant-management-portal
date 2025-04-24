# Fresh Start with Docker

Follow these steps to completely reset your Docker environment and start with a clean slate:

## Step 1: Clean Up Docker Environment

```bash
# Stop and remove all containers
docker-compose down
docker rm -f $(docker ps -a -q) || true

# Remove any dangling volumes
docker volume prune -f

# Clear Docker cache (optional but helpful for a clean start)
docker system prune -f
```

## Step 2: Deploy with Simple Configuration

```bash
# Start with the simplified docker-compose.yml
docker-compose up -d
```

## Step 3: Access and Configure the Application

Once the container is running:

```bash
# Check if the container started successfully
docker ps

# View container logs for any issues
docker logs iceplant-app

# Create a superuser for admin access
docker exec -it iceplant-app bash -c "cd /app/iceplant_portal && python manage.py createsuperuser"
```

## Step 4: Access Your Application

- Frontend: http://146.190.201.119:8080/
- Backend/Admin: http://146.190.201.119:8000/admin/

## Next Steps for Production Use

After confirming everything works, you can:

1. Set up HTTPS with Nginx (see nginx-ssl-fix.md)
2. Configure persistent storage for data (see below)

## Adding Persistent Storage (Optional)

If you need persistent storage:

```bash
# Stop the container
docker-compose down

# Edit docker-compose.yml to add volumes
# Add these lines under your service:
volumes:
  - iceplant_data:/app/iceplant_portal/data

# And add this at the end of the file:
volumes:
  iceplant_data:
```

Then create data directory in your container:

```bash
# Start the container with new configuration
docker-compose up -d

# Create data directory and move database
docker exec -it iceplant-app bash

# Inside the container
mkdir -p /app/iceplant_portal/data
cp /app/iceplant_portal/db.sqlite3 /app/iceplant_portal/data/

# Exit the container
exit
```

Update settings to use the new database location:

```bash
docker exec -it iceplant-app bash -c "cd /app/iceplant_portal && python -c \"
import os
settings_file = 'iceplant_core/settings.py'
with open(settings_file, 'r') as f:
    content = f.read()
if \\\"NAME': BASE_DIR / 'db.sqlite3'\\\" in content:
    content = content.replace(
        \\\"NAME': BASE_DIR / 'db.sqlite3'\\\",
        \\\"NAME': BASE_DIR / 'data' / 'db.sqlite3'\\\"
    )
    with open(settings_file, 'w') as f:
        f.write(content)
    print('Database path updated')
else:
    print('Could not find database path in settings.py')
\""
```

Restart Django inside the container:

```bash
docker exec -it iceplant-app bash -c "cd /app/iceplant_portal && pkill -f runserver && python manage.py runserver 0.0.0.0:8000 &"
```
