# Database Recovery and Persistent Storage Setup

Since the container has already been stopped and removed, we need to:
1. Start the container first
2. Back up the data
3. Implement persistent storage
4. Restart with the new configuration

## Step 1: Start the Container Again

```bash
# Start the container without persistent storage
docker-compose up -d
```

## Step 2: Back Up the Database and Media Files

Wait a few seconds for the container to start fully, then run:

```bash
# Create backup directory (if not already created)
mkdir -p ~/iceplant-backups

# Copy database from container to host
docker cp iceplant-app:/app/iceplant_portal/db.sqlite3 ~/iceplant-backups/

# Copy media files from container to host (if they exist)
docker cp iceplant-app:/app/iceplant_portal/media ~/iceplant-backups/
```

## Step 3: Update docker-compose.yml for Persistent Storage

Edit the docker-compose.yml file to include persistent volumes:

```bash
# Edit the docker-compose.yml file
nano docker-compose.yml
```

Ensure it has these volume mappings:

```yaml
services:
  iceplant:
    # ...existing configuration...
    volumes:
      - .:/app:ro
      - iceplant_db:/app/iceplant_portal/db.sqlite3
      - iceplant_media:/app/iceplant_portal/media
      - iceplant_static:/app/iceplant_portal/staticfiles
      # Don't override these directories
      - /app/node_modules
      - /app/iceplant_portal/frontend/node_modules
      - /app/venv
    # ...rest of configuration...

volumes:
  iceplant_db:
  iceplant_media:
  iceplant_static:
```

## Step 4: Restart with the New Configuration

```bash
# Stop the current container
docker-compose down

# Start containers with new volume configuration
docker-compose up -d
```

## Step 5: Restore Your Data

```bash
# Copy database from host to container
docker cp ~/iceplant-backups/db.sqlite3 iceplant-app:/app/iceplant_portal/

# Copy media files from host to container (if they exist)
docker cp ~/iceplant-backups/media iceplant-app:/app/iceplant_portal/
```

## Step 6: Verify the Restoration

Access your application at http://cma.atlantis-fishing.com:8000/admin/ and check if your data is still there.

## Step 7: Fix Permissions if Needed

If you experience permission issues:

```bash
# Connect to the container
docker exec -it iceplant-app bash

# Fix permissions for the database file
cd /app/iceplant_portal
chmod 664 db.sqlite3

# Exit the container
exit
```

## Additional Note on Persistent SQLite Database

Using a volume for SQLite can sometimes cause issues. If you experience problems, consider:

1. Using a directory volume instead of a file volume:
```yaml
volumes:
  - iceplant_data:/app/iceplant_portal/data
```

2. Moving your SQLite database to that directory and updating settings.py:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'data', 'db.sqlite3'),
    }
}
```

3. For production, consider switching to PostgreSQL for better reliability.
