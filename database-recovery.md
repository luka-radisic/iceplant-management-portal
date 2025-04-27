# Database Recovery and Management Guide

This guide provides instructions for database management, recovery, and troubleshooting in the IcePlant Management Portal.

## Setup Persistent Database Storage

For production deployments, follow these steps to ensure your data persists between container restarts:

### 1. Using PostgreSQL (Recommended for Production)

```bash
# Update your docker-compose.yml to include PostgreSQL
docker compose down

# Edit docker-compose.yml to include:
# services:
#   db:
#     image: postgres:15
#     volumes:
#       - pgdata:/var/lib/postgresql/data
#     environment:
#       POSTGRES_DB: iceplant_db
#       POSTGRES_USER: postgres
#       POSTGRES_PASSWORD: your_secure_password
# 
# volumes:
#   pgdata:
```

### 2. Using SQLite with Persistent Volume

If you prefer SQLite for simplicity, you can use the provided script:

```bash
# Make the script executable
chmod +x setup-persistent-storage.sh

# Run the script
./setup-persistent-storage.sh
```

The script will:
1. Configure a persistent volume for your SQLite database
2. Update Django settings to use the new database location
3. Move any existing database to the persistent location

## Database Backup and Restore

### Backup PostgreSQL Database

```bash
# For PostgreSQL
docker exec -t postgres-db pg_dump -U postgres iceplant_db > backup_$(date +%Y-%m-%d_%H-%M-%S).sql

# For SQLite
docker exec -t iceplant-portal bash -c "cd /app/iceplant_portal && \
  sqlite3 data/db.sqlite3 .dump > /app/backups/backup_$(date +%Y%m%d_%H%M%S).sql"
```

### Restore from Backup

```bash
# PostgreSQL restore
cat backup_file.sql | docker exec -i postgres-db psql -U postgres -d iceplant_db

# SQLite restore (first stop the application)
docker compose stop web
docker exec -it iceplant-portal bash -c "cd /app/iceplant_portal && \
  cat /app/backups/backup_file.sql | sqlite3 data/db.sqlite3"
docker compose start web
```

## Database Migrations

When updating the application with new models or fields:

```bash
# Apply migrations
docker exec -it iceplant-portal bash -c "cd /app/iceplant_portal && python manage.py migrate"

# Create migrations (if you've made model changes)
docker exec -it iceplant-portal bash -c "cd /app/iceplant_portal && python manage.py makemigrations"
```

## Troubleshooting Database Issues

### Connection Issues

If the application can't connect to the database:

1. For PostgreSQL, verify connection details:
```bash
docker exec -it iceplant-portal bash -c "cd /app/iceplant_portal && \
  python -c \"import os; print('DB_NAME:', os.environ.get('POSTGRES_DB')); \
  print('DB_USER:', os.environ.get('POSTGRES_USER')); \
  print('DB_HOST:', os.environ.get('POSTGRES_HOST'));\""
```

2. Test direct database connection:
```bash
# PostgreSQL
docker exec -it postgres-db psql -U postgres -d iceplant_db -c "SELECT 1;"

# SQLite
docker exec -it iceplant-portal bash -c "cd /app/iceplant_portal && \
  sqlite3 data/db.sqlite3 'SELECT 1;'"
```

### Data Corruption

If you suspect data corruption:

1. Create a backup immediately
2. Run database integrity check:
```bash
# SQLite
docker exec -it iceplant-portal bash -c "cd /app/iceplant_portal && \
  sqlite3 data/db.sqlite3 'PRAGMA integrity_check;'"
```

3. Consider restoring from a known good backup

## Database Reset (Development Only)

For development environments, you can reset the database:

```bash
docker exec -it iceplant-portal bash -c "cd /app/iceplant_portal && \
  python manage.py flush --no-input && \
  python manage.py migrate && \
  python manage.py create_demo_data && \
  echo \"from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@example.com', 'admin')\" | python manage.py shell"
```

## Authentication and Login Troubleshooting

If you're experiencing login issues with errors like:
```
Failed to parse JSON response: SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON
```

Verify your authentication setup:

1. Test your auth endpoint:
```bash
curl -X POST http://localhost:8000/api-token-auth/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin"
```

2. Check your authentication URL in the frontend API service:
```bash
docker exec -it iceplant-portal bash -c "cd /app/iceplant_portal/frontend/src/services && cat api.ts | grep login"
```

3. Fix unexpected HTML response issues:
   - Try direct API call instead of proxy through the frontend server
   - Update the login method in your API service to use direct URL

## Setting Up Test Database (for CI/CD)

For test environments:

```bash
# Create a separate test database
docker exec -it postgres-db psql -U postgres -c "CREATE DATABASE test_iceplant_db;"

# Configure Django test settings
echo "
from .settings import *
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'test_iceplant_db',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': 'db',
        'PORT': '5432',
    }
}" > iceplant_portal/iceplant_core/test_settings.py
```

Then run tests with:
```bash
docker exec -it iceplant-portal bash -c "cd /app/iceplant_portal && \
  DJANGO_SETTINGS_MODULE=iceplant_core.test_settings python manage.py test"
```