# Docker Setup for IcePlant Management Portal

This document outlines how to use Docker with the IcePlant Management Portal project.

## Project Structure

The project is structured as follows:
- **Root directory**: Contains package.json with dev dependencies
- **iceplant_portal/**: Main Django application
  - **frontend/**: React frontend application (Vite-based, port 5173)
  - **manage.py**: Django management script
- Django backend runs on port 8000

## Prerequisites

- Docker
- Docker Compose

## Getting Started

### Building and Running

To build and run the application:

```bash
# Build and start the containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the containers
docker-compose down
```

### Accessing the Application

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Django Admin: http://localhost:8000/admin/

## Docker Configuration

### Dockerfile

Our Dockerfile performs the following actions:
- Uses Python 3.11 as the base image
- Installs Node.js for frontend development
- Sets up a Python virtual environment
- Installs dependencies for both frontend and backend
- Creates a script that starts both frontend and backend servers
- Exposes ports 5173 (frontend) and 8000 (backend)

### Docker Compose

The docker-compose.yml file:
- Maps container ports to host ports
- Mounts volumes for development
- Sets environment variables
- Configures healthchecks
- Enables automatic restart

## Development Workflow

When developing with Docker:
1. Changes to Python files are applied immediately
2. Frontend changes trigger automatic rebuilds via Vite

## Volumes

The following volumes are mounted:
- Project files to `/app` for live development
- Virtual environments and node_modules are excluded to avoid conflicts

## Environment Variables

You can customize the following environment variables:
- `FRONTEND_PORT`: Default is 5173
- `BACKEND_PORT`: Default is 8000

## Troubleshooting

### Common Issues

1. **Port conflicts**:
   If ports 5173 or 8000 are already in use, modify the port mappings in docker-compose.yml.

2. **Permission errors**:
   Run Docker commands with sudo if experiencing permission issues.

3. **Container fails to start**:
   Check logs with `docker-compose logs` for detailed error messages.

4. **Frontend not connecting to backend**:
   Ensure backend API URLs are correctly configured.

## Advanced Configuration

For production deployment:
- Update the Dockerfile to use a production-ready web server like Gunicorn
- Configure static file serving
- Set appropriate environment variables for production
- Consider using separate containers for frontend and backend
