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

## License

This project is licensed under the MIT License. 