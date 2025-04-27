# Quick Start Guide for IcePlant Management Portal

This guide provides quick instructions to get the IcePlant Management Portal up and running.

## Prerequisites

- Python 3.8+ 
- Node.js 16+
- npm or yarn
- PostgreSQL (optional, SQLite is used by default)

## Running with the Start Script

The easiest way to start both backend and frontend:

```bash
# From the project root directory
./start.sh
```

Once running:
- Django backend: http://localhost:8000/admin/
- React frontend: http://localhost:5173/

## Manual Setup

### Backend Setup

```bash
# Navigate to the project directory
cd iceplant_portal

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Create a superuser
python manage.py createsuperuser

# Run the Django development server
python manage.py runserver
```

### Frontend Setup

```bash
# Navigate to the frontend directory
cd iceplant_portal/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Docker Setup

For containerized operation:

```bash
# Build and start containers
docker compose up --build

# Create a superuser in the running container
docker exec -it iceplant-portal python manage.py createsuperuser
```

## Troubleshooting the Login Issue

If you're seeing the "Failed to parse response: <!doctype html>..." error when logging in:

### Option 1: Fix Vite Proxy Configuration

```bash
# Edit the Vite config file
cd iceplant_portal/frontend
vi vite.config.ts  # Or use any text editor
```

Update your proxy configuration to:

```typescript
server: {
  proxy: {
    // Add this specific route first - order matters!
    '/api-token-auth/': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      secure: false,
    },
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  }
}
```

Save and restart the Vite server:

```bash
npm run dev
```

### Option 2: Update API Service to Use Direct URL

If Option 1 doesn't work, modify the login API call to use the absolute backend URL:

```bash
cd iceplant_portal/frontend/src/services
vi api.ts  # Or use any text editor
```

Find the login function and update it to:

```typescript
login: async (username: string, password: string) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  
  // Use direct backend URL instead of relative URL
  const response = await axios.post('http://localhost:8000/api-token-auth/', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  
  // Rest of the function...
}
```

### Option 3: Docker Rebuild with Updated Configuration

For a fresh Docker setup with the login issue fixed:

```bash
# Stop containers and remove volumes
docker compose down --volumes

# Edit the frontend Vite config (as in Option 1)
cd iceplant_portal/frontend
vi vite.config.ts

# Rebuild and start containers
cd ../..  # Return to project root
docker compose up --build
```

## Common Issues and Solutions

- **Login fails with HTML response**: See the detailed [login-troubleshooting.md](login-troubleshooting.md) guide
- **Database connection errors**: Verify PostgreSQL settings in settings.py or .env file
- **Frontend cannot connect to backend**: Check CORS settings and Vite proxy configuration
- **Static files not loading**: Run `python manage.py collectstatic` or check STATIC_URL setting

## Next Steps

After successful setup:
1. Login to the admin interface at http://localhost:8000/admin/
2. Create initial data through the admin interface or use sample data
3. Access the frontend application at http://localhost:5173/
4. Explore the different modules: Attendance, Sales, Inventory, etc.