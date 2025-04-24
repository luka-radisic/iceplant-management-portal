# Updating Database Path in Django Settings

Since the automatic script couldn't find the expected database path pattern, let's use a more comprehensive approach:

## Step 1: Inspect the Current Settings File

```bash
# Connect to the container
docker exec -it iceplant-app bash

# Inside the container, check the current database configuration
cd /app/iceplant_portal
grep -A 10 "DATABASES" iceplant_core/settings.py
```

## Step 2: Update the Database Path Using a Custom Script

```bash
# Create a more flexible Python script to update the settings
cat > update_db_settings.py << 'EOF'
import os
import re

# Path to the settings file
settings_path = 'iceplant_core/settings.py'

# Path to the data directory (this is where we want to store the SQLite file)
data_dir = 'data'

# Create the data directory if it doesn't exist
os.makedirs(data_dir, exist_ok=True)

# Read the current settings file
with open(settings_path, 'r') as f:
    content = f.read()

# Function to detect and update the database path
def update_db_path(content):
    # Try to find the DATABASES dictionary definition
    db_section_match = re.search(r'DATABASES\s*=\s*{[^}]*}', content, re.DOTALL)
    
    if not db_section_match:
        print("Could not find DATABASES section in settings.py")
        return content
    
    db_section = db_section_match.group(0)
    
    # Check if it's using SQLite
    if 'sqlite3' not in db_section:
        print("Database is not using SQLite, no need to update path")
        return content
    
    # Try to find the NAME setting with different possible formats
    # Pattern 1: 'NAME': BASE_DIR / 'db.sqlite3'
    pattern1 = re.compile(r"'NAME':\s*BASE_DIR\s*/\s*'db\.sqlite3'")
    # Pattern 2: 'NAME': os.path.join(BASE_DIR, 'db.sqlite3')
    pattern2 = re.compile(r"'NAME':\s*os\.path\.join\(BASE_DIR,\s*'db\.sqlite3'\)")
    # Pattern 3: 'NAME': BASE_DIR / 'file.db'
    pattern3 = re.compile(r"'NAME':\s*BASE_DIR\s*/\s*'[^']*\.db'")
    # Pattern 4: 'NAME': str(BASE_DIR / 'db.sqlite3')
    pattern4 = re.compile(r"'NAME':\s*str\(BASE_DIR\s*/\s*'db\.sqlite3'\)")

    # Check each pattern
    for pattern, replacement, pattern_name in [
        (pattern1, f"'NAME': BASE_DIR / '{data_dir}' / 'db.sqlite3'", "BASE_DIR / 'db.sqlite3'"),
        (pattern2, f"'NAME': os.path.join(BASE_DIR, '{data_dir}', 'db.sqlite3')", "os.path.join"),
        (pattern3, f"'NAME': BASE_DIR / '{data_dir}' / 'file.db'", "BASE_DIR / '*.db'"),
        (pattern4, f"'NAME': str(BASE_DIR / '{data_dir}' / 'db.sqlite3')", "str(BASE_DIR / 'db.sqlite3')")
    ]:
        if pattern.search(db_section):
            print(f"Found pattern: {pattern_name}")
            new_content = pattern.sub(replacement, content)
            return new_content

    # If we get here, we didn't find a matching pattern
    print("Could not find a recognizable database path pattern.")
    print("Current DATABASES section:")
    print(db_section)
    return content

# Update the content
new_content = update_db_path(content)

# Write it back to the file
with open(settings_path, 'w') as f:
    f.write(new_content)

print("Settings file updated. Copying existing database if found...")

# Copy the database if it exists
if os.path.exists('db.sqlite3'):
    import shutil
    os.makedirs(data_dir, exist_ok=True)
    shutil.copy2('db.sqlite3', os.path.join(data_dir, 'db.sqlite3'))
    print(f"Database copied to {data_dir}/db.sqlite3")
else:
    print("No existing database found at db.sqlite3")

print("Done!")
EOF

# Run the script to update the database path
python update_db_settings.py

# Restart Django to use the new database location
pkill -f runserver
python manage.py runserver 0.0.0.0:8000 &

# Exit the container
exit
```

## Step 3: Verify the Changes

After running the script:

1. Check if the data directory contains the database:
   ```bash
   docker exec -it iceplant-app bash -c "ls -la /app/iceplant_portal/data"
   ```

2. Connect to the application and make sure it's working:
   - Visit http://146.190.201.119:8000/admin/

3. Create some test data, restart the container, and verify the data persists:
   ```bash
   docker-compose restart
   ```

## Step 4: Common Issues and Solutions

If you still have database issues:

1. **Manual database path update**:
   ```bash
   docker exec -it iceplant-app bash
   cd /app/iceplant_portal
   # Use a text editor or Python to directly edit settings.py
   ```

2. **Inspect the actual database configuration**:
   ```bash
   docker exec -it iceplant-app python -c "
   import os
   os.chdir('/app/iceplant_portal')
   from iceplant_core.settings import DATABASES
   print('Database configuration:', DATABASES)
   "
   ```

3. **Fix permissions if needed**:
   ```bash
   docker exec -it iceplant-app bash -c "
   chmod -R 777 /app/iceplant_portal/data
   "
   ```
