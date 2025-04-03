# IcePlant Management Portal

A comprehensive web application for managing Ice Plant operations, including time and attendance tracking, sales management, inventory control, and expense tracking.

## Quick Start

For the easiest start-up experience, use the provided start script from this directory:

```bash
# From the project root directory (where this README is located)
./start.sh
```

This script will:
1. Check for required dependencies (Python 3, Node.js, npm)
2. Navigate to the iceplant_portal directory
3. Create and activate a virtual environment if needed
4. Install backend dependencies
5. Install frontend dependencies
6. Apply database migrations
7. Start the Django backend server
8. Start the React frontend development server
9. Provide URLs to access the application

To stop all running development servers:

```bash
# From the project root directory
./stop.sh
```

For advanced debugging, you can start the servers in debug mode:

```bash
./start.sh --debug
```

## Project Structure

```
iceplant-management-portal/       # This directory (project root)
├── .cursor/                      # Cursor-specific project rules and config
│   └── rules.md
├── iceplant_portal/              # Main application directory
│   ├── attendance/               # Django app for attendance tracking
│   ├── expenses/                 # Django app for expense management
│   ├── frontend/                 # React frontend application
│   │   ├── public/               # Static assets
│   │   └── src/                  # React source code
│   │       ├── components/       # Reusable UI components
│   │       ├── contexts/         # React contexts
│   │       ├── hooks/            # Custom React hooks
│   │       ├── layouts/          # Page layouts
│   │       ├── pages/            # Main application pages/features
│   │       ├── services/         # API interaction services
│   │       ├── theme/            # UI theme configuration
│   │       ├── types/            # TypeScript type definitions
│   │       └── utils/            # Utility functions
│   ├── inventory/                # Django app for inventory management
│   ├── maintenance/              # Django app for equipment maintenance
│   ├── sales/                    # Django app for sales tracking
│   ├── iceplant_portal/          # Main Django project settings
│   └── templates/                # Django templates
├── start.sh                      # Startup script for development
└── stop.sh                       # Shutdown script for development
```

## Access the Application

After starting the application using the script:

- Django Admin: http://127.0.0.1:8000/admin/
- Frontend: http://localhost:5173/

## Manual Setup & Management Commands

While the `./start.sh` script handles most common setup tasks, you might need to run Django management commands manually (e.g., `makemigrations`, `migrate`, `shell`, `createsuperuser`).

**1. Navigate to the Backend Directory:**

All `manage.py` commands should be run from the `iceplant_portal` directory:

```bash
cd iceplant_portal
```

**2. Activate the Virtual Environment:**

The project uses a virtual environment located at `iceplant_portal/venv/`. You need to activate it before running commands:

```bash
# From within the iceplant_portal directory
source venv/bin/activate
```

Your terminal prompt should now indicate the active environment (e.g., `(venv) ...`).

**3. Run Management Commands:**

Once the virtual environment is active, use `python3`:

```bash
# Example: Make migrations
python3 manage.py makemigrations

# Example: Apply migrations
python3 manage.py migrate

# Example: Open Django shell
python3 manage.py shell

# Example: Create a superuser
python3 manage.py createsuperuser
```

**Troubleshooting Activation:**

If `source venv/bin/activate` doesn't seem to work correctly (e.g., you still get `ModuleNotFoundError: No module named 'django'`), you can bypass activation by running commands using the virtual environment's specific Python interpreter:

```bash
# From within the iceplant_portal directory
venv/bin/python3 manage.py <your_command>

# Example:
venv/bin/python3 manage.py migrate
```

**4. Deactivate the Virtual Environment:**

When you're finished, you can deactivate the environment:

```bash
deactivate
```

## License

This project is licensed under the MIT License. 