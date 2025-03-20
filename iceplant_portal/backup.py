#!/usr/bin/env python
"""
Database Backup Script for Ice Plant Management Portal
"""
import os
import sys
import subprocess
import datetime
import shutil
import argparse

# Configure backup directory relative to this file
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_BACKUP_DIR = os.path.join(SCRIPT_DIR, 'backups')

def create_backup(backup_dir=DEFAULT_BACKUP_DIR, days_to_keep=30):
    """Create a database backup"""
    # Ensure backup directory exists
    os.makedirs(backup_dir, exist_ok=True)
    
    # Generate backup filename with timestamp
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    backup_file = os.path.join(backup_dir, f'db_backup_{timestamp}.json')
    
    print(f"Creating backup at {backup_file}...")
    
    # Run Django dumpdata command
    try:
        result = subprocess.run(
            [sys.executable, 'manage.py', 'dumpdata', '--indent', '2'],
            cwd=SCRIPT_DIR,
            capture_output=True,
            text=True,
            check=True
        )
        
        # Write output to file
        with open(backup_file, 'w') as f:
            f.write(result.stdout)
            
        print(f"Backup completed successfully!")
        
        # Clean up old backups
        clean_old_backups(backup_dir, days_to_keep)
        
        return backup_file
    except subprocess.CalledProcessError as e:
        print(f"Backup failed: {e}")
        print(f"Error output: {e.stderr}")
        return None

def clean_old_backups(backup_dir, days_to_keep):
    """Delete backups older than days_to_keep"""
    if days_to_keep <= 0:
        print("Keeping all backups (no cleanup)")
        return
        
    print(f"Cleaning up backups older than {days_to_keep} days...")
    
    cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days_to_keep)
    
    for filename in os.listdir(backup_dir):
        if not filename.startswith('db_backup_'):
            continue
            
        filepath = os.path.join(backup_dir, filename)
        file_time = datetime.datetime.fromtimestamp(os.path.getmtime(filepath))
        
        if file_time < cutoff_date:
            print(f"Removing old backup: {filename}")
            os.remove(filepath)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Create a database backup for Ice Plant Management Portal')
    parser.add_argument('--backup-dir', default=DEFAULT_BACKUP_DIR, 
                        help=f'Backup directory (default: {DEFAULT_BACKUP_DIR})')
    parser.add_argument('--days-to-keep', type=int, default=30,
                        help='Number of days to keep backups (default: 30, 0 to keep all)')
    
    args = parser.parse_args()
    backup_file = create_backup(args.backup_dir, args.days_to_keep)
    
    if backup_file:
        print(f"Backup saved to: {backup_file}")
    else:
        print("Backup failed")
        sys.exit(1) 