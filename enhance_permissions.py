"""
Apply the enhanced module_permissions_utils.py to fix the persistence issues
"""
import os
import shutil
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    logger.info("Applying enhanced module_permissions_utils.py")
    
    # Source and destination paths
    source_path = "enhanced_module_permissions_utils.py"
    dest_path = os.path.join("iceplant_portal", "iceplant_core", "module_permissions_utils.py")
    
    # Check if source file exists
    if not os.path.exists(source_path):
        logger.error(f"Source file {source_path} does not exist")
        return False
        
    # Backup original file
    if os.path.exists(dest_path):
        backup_path = f"{dest_path}.bak"
        shutil.copy2(dest_path, backup_path)
        logger.info(f"Original file backed up to {backup_path}")
    
    # Copy enhanced file
    try:
        shutil.copy2(source_path, dest_path)
        logger.info(f"Enhanced file copied to {dest_path}")
        return True
    except Exception as e:
        logger.error(f"Error copying file: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        print("Enhancement applied successfully!")
        print("Please restart the server for changes to take effect.")
    else:
        print("Failed to apply enhancement. Please check the log for details.")
