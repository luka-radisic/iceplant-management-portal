# Setting Up Persistent Storage for Docker

This guide explains how to set up persistent storage for your IcePlant Management Portal Docker deployment.

## Understanding Docker Volumes

By default, Docker containers are ephemeral - all data inside them is lost when the container is removed or recreated. To preserve data between container restarts/rebuilds, we use Docker volumes.

## Updated Docker Configuration

We've updated your docker-compose.yml with three persistent volumes:

1. `iceplant_db`: Stores your SQLite database
2. `iceplant_media`: Stores uploaded files (images, documents, etc.)
3. `iceplant_static`: Stores collected static files

## Implementing the Changes

1. Stop your current containers:
   ```bash
   docker-compose down
   ```

2. If you have data in your current container that you want to keep, back it up:
   ```bash
   # Create a backup directory
   mkdir -p ~/iceplant-backups
   
   # Copy database from container to host
   docker cp iceplant-app:/app/iceplant_portal/db.sqlite3 ~/iceplant-backups/
   
   # Copy media files from container to host
   docker cp iceplant-app:/app/iceplant_portal/media ~/iceplant-backups/
   ```

3. Start containers with the new configuration:
   ```bash
   docker-compose up -d
   ```

4. Restore data if needed:
   ```bash
   # Copy database from host to container
   docker cp ~/iceplant-backups/db.sqlite3 iceplant-app:/app/iceplant_portal/
   
   # Copy media files from host to container
   docker cp ~/iceplant-backups/media iceplant-app:/app/iceplant_portal/
   ```

## Verifying Persistence

To verify that your data is now persistent:

1. Make some changes in the application (create a user, upload files, etc.)
2. Restart the container:
   ```bash
   docker-compose restart
   ```
3. Check if your changes are still there

## Additional Persistence Options

For production environments, consider:

1. Using a separate PostgreSQL container instead of SQLite:
   ```yaml
   services:
     db:
       image: postgres:15
       volumes:
         - postgres_data:/var/lib/postgresql/data
       environment:
         - POSTGRES_PASSWORD=secure_password
         - POSTGRES_USER=iceplant
         - POSTGRES_DB=iceplant_db
     
     iceplant:
       # ...existing configuration...
       depends_on:
         - db
       environment:
         # ...existing environment variables...
         - DATABASE_URL=postgres://iceplant:secure_password@db:5432/iceplant_db
   
   volumes:
     postgres_data:
     # ...other volumes...
   ```

2. Using a backup solution for your volumes:
   ```bash
   # Backup a volume
   docker run --rm -v iceplant_db:/source -v $(pwd):/backup alpine tar -czf /backup/iceplant_db_backup.tar.gz /source

   # Restore a volume
   docker run --rm -v iceplant_db:/target -v $(pwd):/backup alpine sh -c "rm -rf /target/* && tar -xzf /backup/iceplant_db_backup.tar.gz -C /target --strip-components=1"
   ```
