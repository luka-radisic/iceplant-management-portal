import os
import shutil
import tempfile
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Default temp directory inside the project
DEFAULT_TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")

def ensure_dir_exists(directory):
    """Ensure that a directory exists, creating it if necessary."""
    if not os.path.exists(directory):
        os.makedirs(directory)
        logger.info(f"Created directory: {directory}")
    return directory

def get_temp_dir():
    """Get the application's temporary directory, creating it if needed."""
    temp_dir = DEFAULT_TEMP_DIR
    return ensure_dir_exists(temp_dir)

def get_timestamp():
    """Get a timestamp string for use in filenames."""
    return datetime.now().strftime("%Y%m%d_%H%M%S")

def create_debug_file(content, prefix="debug", suffix=".txt", in_temp_dir=True):
    """Create a debug file with the given content and return its path."""
    if in_temp_dir:
        base_dir = get_temp_dir()
    else:
        base_dir = os.getcwd()
        
    timestamp = get_timestamp()
    filename = f"{prefix}_{timestamp}{suffix}"
    filepath = os.path.join(base_dir, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return filepath

def save_debug_text(text, filename, in_temp_dir=True):
    """Save text to a debug file with the given filename."""
    if in_temp_dir:
        filepath = os.path.join(get_temp_dir(), filename)
    else:
        filepath = filename
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
    
    logger.info(f"Saved debug text to {filepath}")
    return filepath

def cleanup_temp_files(age_hours=24, keep_successful_run=False):
    """
    Clean up temporary files older than the specified age.
    
    Args:
        age_hours: Age in hours. Files older than this will be deleted.
        keep_successful_run: If True, only delete files from failed runs.
    """
    temp_dir = get_temp_dir()
    if not os.path.exists(temp_dir):
        return
    
    now = datetime.now()
    count = 0
    
    for filename in os.listdir(temp_dir):
        filepath = os.path.join(temp_dir, filename)
        if os.path.isfile(filepath):
            file_modified = datetime.fromtimestamp(os.path.getmtime(filepath))
            age_hours_actual = (now - file_modified).total_seconds() / 3600
            
            if age_hours_actual > age_hours:
                try:
                    os.remove(filepath)
                    count += 1
                except Exception as e:
                    logger.warning(f"Failed to delete {filepath}: {str(e)}")
    
    if count > 0:
        logger.info(f"Cleaned up {count} temporary files")

def cleanup_all_temp_files():
    """Delete all temporary files and the temp directory."""
    temp_dir = DEFAULT_TEMP_DIR
    if os.path.exists(temp_dir):
        try:
            shutil.rmtree(temp_dir)
            logger.info(f"Removed temporary directory and all files: {temp_dir}")
            return True
        except Exception as e:
            logger.error(f"Failed to remove temp directory: {str(e)}")
            return False
    return True  # No temp dir, so technically clean
