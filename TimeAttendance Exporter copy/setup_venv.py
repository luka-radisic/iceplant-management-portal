#!/usr/bin/env python3
"""
Script to create and setup a virtual environment for TimeAttendance Exporter
"""
import os
import sys
import subprocess
import platform

def main():
    """Create virtual environment and install dependencies"""
    # Determine the project directory
    project_dir = os.path.dirname(os.path.abspath(__file__))
    venv_dir = os.path.join(project_dir, 'venv')
    
    print(f"Setting up virtual environment in: {venv_dir}")
    
    # Create virtual environment
    try:
        import venv
        venv.create(venv_dir, with_pip=True)
    except Exception as e:
        print(f"Error creating virtual environment: {str(e)}")
        return False
    
    # Determine the path to the Python executable in the virtual environment
    if platform.system() == "Windows":
        python_path = os.path.join(venv_dir, "Scripts", "python.exe")
        pip_path = os.path.join(venv_dir, "Scripts", "pip.exe")
        activate_cmd = os.path.join(venv_dir, "Scripts", "activate")
    else:  # macOS/Linux
        python_path = os.path.join(venv_dir, "bin", "python")
        pip_path = os.path.join(venv_dir, "bin", "pip")
        activate_cmd = f"source {os.path.join(venv_dir, 'bin', 'activate')}"
    
    # Install required packages
    print("\nInstalling required packages...")
    requirements_path = os.path.join(project_dir, "requirements.txt")
    try:
        subprocess.check_call([pip_path, "install", "-r", requirements_path])
    except Exception as e:
        print(f"Error installing dependencies: {str(e)}")
        return False
    
    print("\n✅ Virtual environment setup complete!")
    print("\nTo activate the virtual environment:")
    print(f"   {activate_cmd}")
    print("\nTo run the application after activating:")
    print("   python app.py")
    print("\nTo initialize the database:")
    print("   python init_db.py")
    
    return True

if __name__ == "__main__":
    sys.exit(0 if main() else 1)
