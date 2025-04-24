# Building and Running the IcePlant Docker Image

Follow these steps to build and run the IcePlant Management Portal using Docker:

## Build the Docker Image

```bash
# Navigate to the project directory
cd "/Users/luka/Documents/IcePlant WEB UI/iceplant-management-portal"

# Build the Docker image
docker-compose build
```

## Run the Container

```bash
# Start the containers in detached mode
docker-compose up -d

# View logs (optional)
docker-compose logs -f
```

## Access the Application

- Frontend: http://localhost:5173
- Backend/API: http://localhost:8000
- Django Admin: http://localhost:8000/admin/

## Stop the Container

```bash
# Stop the running containers
docker-compose down
```

## Useful Docker Commands

```bash
# List running containers
docker ps

# View container logs
docker logs iceplant-app

# Access container shell
docker exec -it iceplant-app bash

# Rebuild and restart containers
docker-compose up -d --build
```

## Troubleshooting

If you encounter issues:

1. Check that ports 5173 and 8000 are not already in use
2. Ensure Docker Desktop is running
3. Verify that the project structure matches what's expected in the Dockerfile
4. Check container logs for specific error messages
