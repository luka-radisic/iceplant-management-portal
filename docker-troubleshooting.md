# Docker Troubleshooting Guide for IcePlant Portal

## Common Issues and Solutions

### Import Statement Errors During Frontend Build

**Error Pattern:**
```
error during build:
src/pages/SomePage.tsx: "apiService" is not exported by "src/services/api.ts", imported by "src/pages/SomePage.tsx".
```

**Solution:**
This occurs because apiService is exported as a default export in api.ts but being imported as a named export in various components.

Fix by changing import statements from:
```typescript
import { apiService } from '../services/api';
```

To:
```typescript
import apiService from '../services/api';
```

**Files That May Need This Fix:**
- SalesPage.tsx
- BuyersPage.tsx
- InventoryPage.tsx
- ExpensePage.tsx
- Any other page that imports apiService

### Node Modules Installation Failures

**Error Pattern:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution:**
Use the `--force` or `--legacy-peer-deps` flag:

```bash
npm install --legacy-peer-deps
```

### Environment Variable Issues

**Error Pattern:**
```
KeyError: 'DJANGO_SECRET_KEY'
```

**Solution:**
Ensure all required environment variables are defined in your .env file or docker-compose.yml:

```yaml
environment:
  - DJANGO_SECRET_KEY=your_secret_key
  - DEBUG=True
  - DATABASE_URL=postgres://postgres:postgres@db:5432/iceplant
```

### Database Connection Issues

**Error Pattern:**
```
django.db.utils.OperationalError: could not connect to server: Connection refused
```

**Solution:**
1. Check if the database container is running:
   ```bash
   docker compose ps
   ```

2. Ensure the database service is started before the web service:
   ```yaml
   services:
     web:
       depends_on:
         - db
   ```

### Static Files Not Found

**Error Pattern:**
404 errors when trying to access static files

**Solution:**
Ensure the static files volume is properly mounted and `collectstatic` has been run:

```yaml
volumes:
  - static_volume:/app/iceplant_portal/staticfiles
```

Add to your Dockerfile:
```dockerfile
RUN python manage.py collectstatic --noinput
```

## Quick Reset for Development

If you need to completely reset your Docker environment:

```bash
# Stop all containers and remove volumes
docker compose down --volumes --remove-orphans

# Remove any dangling images
docker image prune -a

# Rebuild and start containers
docker compose up --build
```