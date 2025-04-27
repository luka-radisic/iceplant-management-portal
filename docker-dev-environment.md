# Docker Development Environment Setup

This guide provides instructions for setting up a Docker development environment that properly handles API routing, especially for the authentication endpoints.

## Overview

The development environment will use:
- Nginx as a reverse proxy to route requests correctly
- Django backend container
- React frontend container with Vite
- PostgreSQL database container

This setup eliminates proxy issues by having Nginx handle all the routing between frontend and backend.

## Step 1: Create Nginx Configuration

Create a new file called `nginx-dev.conf` in the project root:

```nginx
server {
    listen 80;
    server_name localhost;

    # Frontend assets
    location / {
        proxy_pass http://frontend:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # API endpoints including auth
    location ~ ^/(api|api-token-auth|admin) {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files
    location /static/ {
        proxy_pass http://backend:8000/static/;
    }

    # Media files
    location /media/ {
        proxy_pass http://backend:8000/media/;
    }
}
```

## Step 2: Create Docker Compose Configuration

Create a new `docker-compose.dev.yml` in the project root:

```yaml
version: '3.9'

services:
  db:
    image: postgres:15
    container_name: iceplant-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: iceplant_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - iceplantnet

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend.dev
    container_name: iceplant-backend
    depends_on:
      - db
    volumes:
      - ./iceplant_portal:/app/iceplant_portal
      - static_volume:/app/iceplant_portal/staticfiles
      - media_volume:/app/iceplant_portal/media
    environment:
      DJANGO_DEBUG: "True"
      POSTGRES_DB: iceplant_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_HOST: db
      POSTGRES_PORT: 5432
      DJANGO_ALLOWED_HOSTS: "localhost,backend,127.0.0.1,0.0.0.0"
      DJANGO_CORS_ALLOWED_ORIGINS: "http://localhost,http://localhost:5173,http://localhost:8000"
    networks:
      - iceplantnet

  frontend:
    build:
      context: ./iceplant_portal/frontend
      dockerfile: Dockerfile.frontend.dev
    container_name: iceplant-frontend
    volumes:
      - ./iceplant_portal/frontend:/app
      - /app/node_modules
    environment:
      VITE_API_URL: "http://localhost"
    networks:
      - iceplantnet

  nginx:
    image: nginx:latest
    container_name: iceplant-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx-dev.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
      - frontend
    networks:
      - iceplantnet

networks:
  iceplantnet:
    driver: bridge

volumes:
  pgdata:
  static_volume:
  media_volume:
```

## Step 3: Create Backend Development Dockerfile

Create a new `Dockerfile.backend.dev` in the project root:

```dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    postgresql-client \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY ./iceplant_portal/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Start the Django development server
CMD ["bash", "-c", "cd /app/iceplant_portal && python manage.py collectstatic --noinput && python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
```

## Step 4: Create Frontend Development Dockerfile

Create a new `Dockerfile.frontend.dev` in the `iceplant_portal/frontend` directory:

```dockerfile
FROM node:20-slim

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Start the Vite development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

## Step 5: Update Environment Variables in Frontend

Edit `iceplant_portal/frontend/.env.development` (create if it doesn't exist):

```
VITE_API_URL=http://localhost
```

## Step 6: Launch the Development Environment

```bash
# Build and start containers
docker compose -f docker-compose.dev.yml up --build

# Create a superuser in the running container (in a new terminal)
docker exec -it iceplant-backend python /app/iceplant_portal/manage.py createsuperuser
```

## Step 7: Access the Application

- **Frontend**: http://localhost/
- **Backend API**: http://localhost/api/
- **Admin Panel**: http://localhost/admin/
- **Authentication**: http://localhost/api-token-auth/

## Advantages of this Setup

1. **No proxy issues**: Nginx properly routes all requests to the correct service
2. **Hot reloading works**: Changes to code are immediately reflected in development
3. **Consistent URLs**: Frontend code can use consistent relative URLs in development and production
4. **Simple debugging**: Each service has its own logs
5. **No CORS issues**: All requests come from the same origin

## Troubleshooting

If the login still fails:

1. Check Nginx logs:
```bash
docker exec -it iceplant-nginx cat /var/log/nginx/error.log
```

2. Check backend logs:
```bash
docker logs iceplant-backend
```

3. Test the auth endpoint directly:
```bash
curl -X POST http://localhost/api-token-auth/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=youruser&password=yourpassword"
```

4. Verify the auth endpoint is configured correctly in Django:
```bash
docker exec -it iceplant-backend python -c "import django; django.setup(); from django.urls import reverse; print(reverse('api_token_auth'))"
```