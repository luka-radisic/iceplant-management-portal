# Quick Start Guide for IcePlant Portal

## Starting the Application

```bash
# Start the application
docker-compose up -d
```

## Verify It's Running

```bash
# Check if the container is running
docker ps

# Check the container logs
docker logs iceplant-app
```

## Create an Admin User

```bash
# Connect to the container
docker exec -it iceplant-app bash

# Create a superuser for the Django admin
cd /app/iceplant_portal
python manage.py createsuperuser
# Follow the prompts to create your admin user

# Exit the container
exit
```

## Access Your Application

- **Admin Interface**: http://146.190.201.119:8000/admin
- **Frontend Interface**: http://146.190.201.119:8080

## Update ALLOWED_HOSTS if needed

If you're still seeing a DisallowedHost error:

```bash
# Connect to the container
docker exec -it iceplant-app bash

# Edit settings.py using Python to add your domain
cd /app/iceplant_portal
python -c "
with open('iceplant_core/settings.py', 'r') as f:
    content = f.read()
if 'ALLOWED_HOSTS' in content:
    content = content.replace(
        'ALLOWED_HOSTS = [', 
        'ALLOWED_HOSTS = [\"cma.atlantis-fishing.com\", '
    )
    with open('iceplant_core/settings.py', 'w') as f:
        f.write(content)
    print('Added domain to ALLOWED_HOSTS')
"

# Restart the Django server
pkill -f runserver
python manage.py runserver 0.0.0.0:8000 &

# Exit the container
exit
```
