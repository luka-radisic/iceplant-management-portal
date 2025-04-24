# Fixing Nginx and SSL Setup for IcePlant Portal

The error occurs because your Docker container is already using port 80, which prevents Nginx from binding to it. Let's fix this:

## Step 1: Modify Docker Container Port Mapping

First, update your Docker container to use a different port:

```bash
# Stop the current container
docker-compose down

# Edit docker-compose.yml
nano docker-compose.yml
```

Change the port mapping from `"80:5173"` to `"8080:5173"`:

```yaml
services:
  iceplant:
    # ... existing configuration ...
    ports:
      - "8080:5173"  # Changed from 80:5173
      - "8000:8000"  # Keep backend port as is
    # ... rest of configuration ...
```

Save the file and restart the container:

```bash
docker-compose up -d
```

## Step 2: Update Nginx Configuration

Now update your Nginx configuration to reflect the new port:

```bash
# Edit the Nginx configuration
nano /etc/nginx/sites-available/iceplant
```

Modify the proxy_pass for the frontend:

```
server {
    listen 80;
    server_name cma.atlantis-fishing.com;

    location / {
        proxy_pass http://localhost:8080;  # Changed from 5173 to 8080
        # ... rest of configuration ...
    }

    # ... other locations remain the same ...
}
```

## Step 3: Verify Nginx Configuration and Start the Service

```bash
# Test the configuration
nginx -t

# Start/restart Nginx
systemctl start nginx
# or
systemctl restart nginx
```

## Step 4: Obtain SSL Certificate

Now that port 80 is available for Nginx, run Certbot:

```bash
certbot --nginx -d cma.atlantis-fishing.com
```

## Step 5: Update CORS Settings

After successfully setting up HTTPS, update your CORS settings in the Django container:

```bash
docker exec -it iceplant-app bash
cd /app/iceplant_portal/iceplant_core/
nano settings.py
```

Update ALLOWED_HOSTS and CORS_ALLOWED_ORIGINS:

```python
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '146.190.201.119', 'cma.atlantis-fishing.com']

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "https://cma.atlantis-fishing.com",
    "http://cma.atlantis-fishing.com"
]
```

Restart the Django server:

```bash
pkill -f runserver
cd /app/iceplant_portal
python manage.py runserver 0.0.0.0:8000 &
```

## Accessing Your Application

After these changes:
- Your site will be accessible at: https://cma.atlantis-fishing.com
- The backend will be accessible at: https://cma.atlantis-fishing.com/admin
