# Domain Configuration Fix

## Adding Domain to Django ALLOWED_HOSTS

Execute these commands on your server to fix the DisallowedHost error:

```bash
# Connect to the Docker container
docker exec -it iceplant-app bash

# Navigate to Django settings
cd /app/iceplant_portal/iceplant_core/

# Edit the settings file
nano settings.py
```

In the settings.py file, find the ALLOWED_HOSTS setting and update it to include your domain:

```python
# Find this line
ALLOWED_HOSTS = []

# Change it to include your domain and all needed hosts
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '146.190.201.119', 'cma.atlantis-fishing.com']
```

Save the file (Ctrl+O, then Enter) and exit nano (Ctrl+X).

Now update the CORS settings as well:

```python
# Find the CORS settings
CORS_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

# Add your domain to it
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://cma.atlantis-fishing.com',
    'https://cma.atlantis-fishing.com',
]

# You might also want to add CSRF trusted origins
CSRF_TRUSTED_ORIGINS = [
    'http://cma.atlantis-fishing.com',
    'https://cma.atlantis-fishing.com',
]
```

Finally, restart the Django server:

```bash
# Kill the existing Django server process
pkill -f runserver

# Start a new Django server
cd /app/iceplant_portal
python manage.py runserver 0.0.0.0:8000 &

# Exit the container
exit
```

## Environment Variables Alternative

For a more permanent solution, you can modify your docker-compose.yml to include the domain in environment variables:

```yaml
services:
  iceplant:
    # ... existing configuration ...
    environment:
      - FRONTEND_PORT=5173
      - BACKEND_PORT=8000
      - DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,146.190.201.119,cma.atlantis-fishing.com
      - CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://cma.atlantis-fishing.com,https://cma.atlantis-fishing.com
    # ... rest of configuration ...
```

Then restart the container:

```bash
docker-compose down
docker-compose up -d
```

This approach will ensure your domain is always included in the allowed hosts, even after container restarts.
