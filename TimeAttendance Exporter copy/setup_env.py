import os
import subprocess
import sys
import venv

def create_virtual_environment():
    print("Creating virtual environment...")
    venv_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'venv')
    venv.create(venv_dir, with_pip=True)
    return venv_dir

def install_dependencies(venv_dir):
    print("Installing dependencies...")
    # Determine platform-specific Python and pip paths
    if sys.platform == 'win32':
        python_path = os.path.join(venv_dir, 'Scripts', 'python.exe')
        pip_path = os.path.join(venv_dir, 'Scripts', 'pip.exe')
    else:
        python_path = os.path.join(venv_dir, 'bin', 'python')
        pip_path = os.path.join(venv_dir, 'bin', 'pip')
    
    # Install required packages
    subprocess.check_call([pip_path, 'install', 'PyPDF2', 'pandas', 'openpyxl'])
    print("Successfully installed dependencies!")

def main():
    venv_dir = create_virtual_environment()
    install_dependencies(venv_dir)
    print("\nVirtual environment created successfully!")
    print("\nTo activate the virtual environment:")
    if sys.platform == 'win32':
        print(f"Run: .\\venv\\Scripts\\activate")
    else:
        print(f"Run: source venv/bin/activate")

if __name__ == "__main__":
    main()
