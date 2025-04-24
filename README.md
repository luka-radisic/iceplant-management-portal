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

## Docker Setup

For containerized deployment, you can use Docker:

```bash
# Build the Docker image
docker-compose build

# Start the containers
docker-compose up -d

# View logs (optional)
docker-compose logs -f
```

See the [build-and-run.md](build-and-run.md) file for more Docker instructions.

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

After starting the application:

- Django Admin: http://127.0.0.1:8000/admin/
- Frontend: http://localhost:5173/
- **Attendance Cleanup Tool:** Accessible on the Tools page, visible only to superusers.

## Manual Setup & Management Commands

While the `./start.sh` script handles most common setup tasks, you might need to run Django management commands manually.

### Backend Setup

1. Navigate to the iceplant_portal directory
   ```bash
   cd iceplant_portal
   ```

2. Create and activate a virtual environment
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

4. Apply migrations
   ```bash
   python manage.py migrate
   ```

5. (Optional) Load initial demo data
   ```bash
   python manage.py create_demo_data
   ```

6. Create a superuser (for admin access)
   ```bash
   python manage.py createsuperuser
   ```

7. Run the development server
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. Navigate to the frontend directory
   ```bash
   cd iceplant_portal/frontend
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

**Troubleshooting Activation:**

If `source venv/bin/activate` doesn't work correctly, you can use the virtual environment's specific Python interpreter:

```bash
# From within the iceplant_portal directory
venv/bin/python3 manage.py <your_command>
```

## Features

- Attendance import, management, and analytics
- Bulk Attendance Cleanup Tool with filters (Month, Employee, Department, Date Range)
- Dry-run preview before deletion
- Role-based access control (HR and superusers)
- Sales, Inventory, Expenses modules
- Equipment maintenance tracking and scheduling
- Automated database backup via GitHub Actions
- Dockerized deployment support

## Deployment Notes

- Environment variables configured in `.env` or `.env.example`
- PostgreSQL recommended for production
- Static files collected via `python manage.py collectstatic`
- For production, use Gunicorn (see `Dockerfile`)

## Change Log

### 2025-04-11

**AttendanceList CSV Export Tool Enhancement**
- The AttendanceList CSV export now includes the following columns for each record, with all fields correctly populated:
  - Employee ID
  - Name
  - Department
  - Date (YYYY-MM-DD)
  - Day (Weekday, e.g., Monday)
  - Check In
  - Check Out
  - Duration (min)
  - Status
  - Checked
  - Approval Status
  - HR Note
- Exported CSV matches the displayed data and respects all current filters, with a maximum of 10,000 records per export.
- All date and time fields use the same formatting as the table view for consistency.
- This change addresses user feedback and requirements described in `docs/attendance_page_enhancement_context.md`.
- Code is documented with references to the context doc and user feedback.

### 2025-04-05

**Attendance Cleanup Tool**
- Added Attendance Punchcard Cleanup Tool (bulk delete with filters, dry-run, audit logging)
- Updated implementation plan accordingly
- Improved permission checks and UI integration

## License

This project is licensed under the MIT License.