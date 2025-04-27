# Frontend Troubleshooting Guide

## Common Issues

### 1. "404 Not Found" for all frontend routes

**Problem:**
When trying to access any frontend route (e.g., `/login`, `/`), you get a 404 Not Found error, even though the backend API works fine.

**Symptoms:**
- Browser console shows: `GET http://localhost:5173/login 404 (Not Found)`
- Docker logs show successful backend startup but no indication of frontend routes being handled

**Causes:**
1. The static files from the frontend build are not being served correctly
2. The `serve` command in `docker-entrypoint.sh` has incorrect paths
3. The frontend build process failed or produced files in an unexpected location

**Solutions:**

#### Check if frontend files exist in the container:

```bash
# Check if the dist directory exists and has files
docker exec -it iceplant-portal ls -la /app/iceplant_portal/frontend/dist
```

#### Option 1: Update Docker entrypoint script

Edit your `docker-entrypoint.sh` to ensure it's serving files from the correct location:

```bash
#!/bin/bash -e
cd /app/iceplant_portal
pip install --no-cache-dir -r requirements.txt
python manage.py migrate --noinput
python manage.py runserver 0.0.0.0:8000 &

# Make sure we're serving from the right directory
cd /app/iceplant_portal/frontend
# Check if dist directory exists, show error if not
if [ ! -d "dist" ]; then
  echo "ERROR: Frontend build directory (dist) not found!"
  echo "Rebuilding frontend..."
  npm run build
fi
# Use explicit path to dist directory
serve -s dist -l 5173 --no-clipboard &
wait -n
```

#### Option 2: Modify your Dockerfile to ensure proper build

In your Dockerfile, ensure the frontend build step is explicit:

```dockerfile
# Install frontend dependencies and build
WORKDIR /app/iceplant_portal/frontend
RUN rm -rf node_modules package-lock.json && npm install --legacy-peer-deps
RUN echo 'Building frontend...' && npx vite build
RUN ls -la dist  # Verify build output exists
```

#### Option 3: Update Nginx configuration (if using Nginx)

If you're using Nginx as a reverse proxy, ensure your configuration is correct:

```
location / {
    try_files $uri $uri/ /index.html;
    root /path/to/frontend/dist;
    index index.html;
}
```

### 2. Frontend routes work but API calls fail

**Problem:**
The frontend loads, but API calls to backend endpoints fail.

**Symptoms:**
- Can access login page but login attempts fail
- Network tab shows 404 errors for API requests

**Solutions:**
1. Check proxy configuration in `vite.config.ts`
2. Verify CORS settings in Django settings.py
3. Check the logs for specific API endpoints that are failing

## Quick Checks

### 1. Verify frontend build

```bash
docker exec -it iceplant-portal bash -c "ls -la /app/iceplant_portal/frontend/dist"
```

### 2. Check if frontend server is running

```bash
docker exec -it iceplant-portal bash -c "ps aux | grep serve"
```

### 3. Check for Docker port mappings

```bash
docker port iceplant-portal
```

### 4. Test if backend is accessible

```bash
curl http://localhost:8000/admin/
```

## Common Fixes

### Rebuild the frontend inside the container

```bash
docker exec -it iceplant-portal bash -c "cd /app/iceplant_portal/frontend && npm run build && serve -s dist -l 5173"
```

### Update docker-compose.yml with explicit volumes

```yaml
services:
  web:
    # ...existing config...
    volumes:
      - ./iceplant_portal:/app/iceplant_portal
      - static_volume:/app/iceplant_portal/staticfiles
      - media_volume:/app/iceplant_portal/media
      # Add frontend dist as a named volume to persist between rebuilds
      - frontend_dist:/app/iceplant_portal/frontend/dist
```

### If frontend is served from Django:

Make sure your Django URLs include a catch-all route that serves the frontend:

```python
# In urls.py
urlpatterns = [
    # ... API routes ...
    
    # Serve the React frontend for all other routes
    re_path(r'^(?!api/).*$', TemplateView.as_view(template_name='index.html')),
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
]
```