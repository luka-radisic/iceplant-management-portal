#!/usr/bin/env python3
import os
import shutil
import zipfile
import logging
from datetime import datetime
from db_interface import DATABASE_FILE

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Default backup directory
BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')

def ensure_backup_dir():
    """Create backup directory if it doesn't exist."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    return BACKUP_DIR

def backup_database(db_path=DATABASE_FILE, backup_dir=None):
    """
    Create a backup of the database file.
    
    Args:
        db_path: Path to the database file
        backup_dir: Directory to save the backup
        
    Returns:
        Tuple of (success, message, backup_path)
    """
    if backup_dir is None:
        backup_dir = ensure_backup_dir()
    
    if not os.path.exists(db_path):
        return False, f"Database file {db_path} does not exist", None
    
    try:
        # Create backup filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"attendance_db_{timestamp}.db"
        backup_path = os.path.join(backup_dir, backup_name)
        
        # Copy database file
        shutil.copy2(db_path, backup_path)
        logger.info(f"Database backup created: {backup_path}")
        
        return True, f"Database backup created: {backup_name}", backup_path
    
    except Exception as e:
        logger.error(f"Error creating database backup: {str(e)}")
        return False, f"Error creating database backup: {str(e)}", None

def create_full_backup(db_path=DATABASE_FILE, include_uploads=True):
    """
    Create a comprehensive backup including database and optionally uploaded files.
    
    Args:
        db_path: Path to the database file
        include_uploads: Whether to include the uploads folder
        
    Returns:
        Tuple of (success, message, backup_zip_path)
    """
    backup_dir = ensure_backup_dir()
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    zip_filename = f"timeattendance_backup_{timestamp}.zip"
    zip_path = os.path.join(backup_dir, zip_filename)
    
    try:
        # Create a new zip file
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add database
            if os.path.exists(db_path):
                zipf.write(db_path, os.path.basename(db_path))
                logger.info(f"Added database to backup: {db_path}")
            
            # Add uploads folder if requested
            if include_uploads:
                uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
                if os.path.exists(uploads_dir):
                    for root, _, files in os.walk(uploads_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            # Add file to zip with relative path
                            arcname = os.path.relpath(file_path, os.path.dirname(uploads_dir))
                            zipf.write(file_path, arcname)
                    logger.info(f"Added uploads folder to backup")
        
        return True, f"Full backup created: {zip_filename}", zip_path
    
    except Exception as e:
        logger.error(f"Error creating full backup: {str(e)}")
        return False, f"Error creating full backup: {str(e)}", None

def get_available_backups():
    """
    Get a list of available backups.
    
    Returns:
        List of dictionaries with backup information
    """
    backup_dir = ensure_backup_dir()
    backups = []
    
    try:
        # List all files in the backup directory
        for filename in os.listdir(backup_dir):
            file_path = os.path.join(backup_dir, filename)
            if os.path.isfile(file_path):
                # Get file stats
                stats = os.stat(file_path)
                backups.append({
                    'filename': filename,
                    'path': file_path,
                    'size': stats.st_size,
                    'created': datetime.fromtimestamp(stats.st_ctime),
                    'is_zip': filename.endswith('.zip'),
                    'is_db': filename.endswith('.db')
                })
        
        # Sort by creation time, newest first
        backups.sort(key=lambda x: x['created'], reverse=True)
        
        return backups
    
    except Exception as e:
        logger.error(f"Error getting available backups: {str(e)}")
        return []

if __name__ == "__main__":
    # Command-line interface for backups
    import argparse
    
    parser = argparse.ArgumentParser(description="Database backup utility")
    parser.add_argument('--db-only', action='store_true', help='Only backup the database file')
    parser.add_argument('--full', action='store_true', help='Create a full backup (database + uploads)')
    parser.add_argument('--list', action='store_true', help='List available backups')
    
    args = parser.parse_args()
    
    if args.list:
        backups = get_available_backups()
        print(f"Available backups ({len(backups)}):")
        for i, backup in enumerate(backups):
            size_kb = backup['size'] / 1024
            print(f"{i+1}. {backup['filename']} - {size_kb:.1f} KB - {backup['created'].strftime('%Y-%m-%d %H:%M:%S')}")
    
    elif args.full:
        success, message, path = create_full_backup()
        print(message)
    
    else:  # Default to db-only backup
        success, message, path = backup_database()
        print(message)
