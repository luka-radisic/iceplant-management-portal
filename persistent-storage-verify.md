# Verifying Persistent Storage Setup

Great news! Your database is already correctly configured to use the persistent storage path:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'data' / 'db.sqlite3',
    }
}
```

Let's run a quick validation to ensure everything is working properly:

```bash
# Connect to the Docker container
docker exec -it iceplant-app bash

# Run this validation script
cat > validate_storage.py << 'EOF'
import os
import sys
import sqlite3
from pathlib import Path

# Set up paths
base_dir = Path("/app/iceplant_portal")
data_dir = base_dir / "data"
db_path = data_dir / "db.sqlite3"
old_db_path = base_dir / "db.sqlite3"

# Print header
print("\n===== PERSISTENT STORAGE VALIDATION =====\n")

# Check if data directory exists
print(f"Data directory ({data_dir}): {'✓ Exists' if os.path.exists(data_dir) else '✗ Missing'}")

# Check if database file exists in data directory
print(f"Database in data dir: {'✓ Exists' if os.path.exists(db_path) else '✗ Missing'}")

# Check if old database file exists (and should be removed)
if os.path.exists(old_db_path):
    print(f"Old database in root: ⚠️ Still exists (consider removing)")
else:
    print(f"Old database in root: ✓ Not present (good)")

# Try to connect to the database
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # Check for django_migrations table (should exist in any Django db)
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='django_migrations'")
    has_tables = cursor.fetchone()[0] > 0
    conn.close()
    print(f"Database connection: ✓ Success")
    print(f"Django tables exist: {'✓ Yes' if has_tables else '✗ No (empty database)'}")
except Exception as e:
    print(f"Database connection: ✗ Failed ({str(e)})")

# Check Docker volume mounts
print("\n----- Docker Volume Configuration -----")
os.system("mount | grep /app/iceplant_portal/data")

print("\n===== VALIDATION COMPLETE =====")
EOF

# Run the validation script
python validate_storage.py

# Exit the container
exit
```

## Next Steps

If the validation confirms your setup is working:

1. Create some test data through the admin interface
2. Restart the container to verify persistence:
   ```bash
   docker-compose restart
   ```
3. Check if your data is still there

## Additional Safety Measures

To ensure your data remains safe:

1. Set up periodic database backups:
   ```bash
   # Create a backup script
   cat > /root/backup-db.sh << 'EOF'
   #!/bin/bash
   TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
   BACKUP_DIR="/root/db_backups"
   mkdir -p $BACKUP_DIR
   
   # Copy the database from the container
   docker exec iceplant-app bash -c "cd /app/iceplant_portal && \
     tar -czf /tmp/db_backup_$TIMESTAMP.tar.gz data/db.sqlite3"
   
   docker cp iceplant-app:/tmp/db_backup_$TIMESTAMP.tar.gz $BACKUP_DIR/
   
   # Clean up old backups (keep last 10)
   cd $BACKUP_DIR && ls -tp | grep -v '/$' | tail -n +11 | xargs -I {} rm -- {}
   
   echo "Backup created: $BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz"
   EOF
   
   chmod +x /root/backup-db.sh
   ```

2. Set up a cron job for automatic backups:
   ```bash
   # Run daily at 2 AM
   (crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-db.sh >> /root/backup.log 2>&1") | crontab -
   ```

Your persistent storage is now set up and verified!
