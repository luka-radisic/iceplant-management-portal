# Docker Troubleshooting Guide

## Fixing ALLOWED_HOSTS Issue

Follow these exact steps to fix the DisallowedHost error:

1. **SSH back into your server**:
   ```bash
   ssh root@146.190.201.119
   ```

2. **First, restart your Docker container properly**:
   ```bash
   # Make sure you're in a directory where docker-compose.yml exists
   cd ~
   docker-compose restart
   ```

3. **Connect to the running container to make changes**:
   ```bash
   # Execute a shell inside the container
   docker exec -it iceplant-app bash
   ```

4. **Now edit the settings file inside the container**:
   ```bash
   # Go to the Django project directory
   cd /app/iceplant_portal/iceplant_core/
   
   # Edit settings.py with nano
   nano settings.py
   ```

5. **Find the ALLOWED_HOSTS line and ensure it contains your server IP**:
   ```python
   ALLOWED_HOSTS = ['localhost', '127.0.0.1', '146.190.201.119']
   ```

6. **Save the file** (press Ctrl+O, then Enter, then Ctrl+X)

7. **Restart Django within the container**:
   ```bash
   cd /app/iceplant_portal
   pkill -f runserver
   python manage.py runserver 0.0.0.0:8000 &
   ```

8. **Exit the container**:
   ```bash
   exit
   ```

9. **Test access to your application**:
   - Frontend: http://146.190.201.119/
   - Backend: http://146.190.201.119:8000/admin/

## Creating a Superuser

If you need to create an admin account:

```bash
# Connect to the Docker container
docker exec -it iceplant-app bash

# Navigate to Django project
cd /app/iceplant_portal

# Create the superuser
python manage.py createsuperuser
```
Follow the prompts to set username, email, and password.

## Common Issues

### Path Not Found
If you see errors like "No such file or directory", make sure you're running commands inside the container with `docker exec -it iceplant-app bash` first.

### Container Not Running
If the container crashed, check the logs:
```bash
docker logs iceplant-app
```

### Restarting the Container
If you need a fresh start:
```bash
docker-compose down
docker-compose up -d
```
