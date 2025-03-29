# IcePlant Management Portal

A comprehensive web application for managing Ice Plant operations, including time and attendance tracking, sales management, inventory control, and expense tracking.

## Quick Start

For the easiest start-up experience, use the provided start script:

```bash
cd iceplant_portal
./start.sh
```

This script will:
1. Check for required dependencies (Python 3, Node.js, npm)
2. Create and activate a virtual environment if needed
3. Install backend dependencies
4. Install frontend dependencies
5. Apply database migrations
6. Start the Django backend server
7. Start the React frontend development server
8. Provide URLs to access the application

To stop all running development servers:

```bash
cd iceplant_portal
./stop.sh
```

For advanced debugging, you can start the servers in debug mode:

```bash
./start.sh --debug
```

## Manual Setup

If you prefer to set up the application manually, follow these steps:

### Backend Setup

1. Navigate to the project directory
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

5. Create a superuser (for admin access)
   ```bash
   python manage.py createsuperuser
   ```

6. Run the development server
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

## Access the Application

- Django Admin: http://127.0.0.1:8000/admin/
- Frontend: http://localhost:5173/

## Project Structure

```
iceplant_portal/
├── attendance/         # Django app for attendance tracking
├── expenses/           # Django app for expense management
├── frontend/           # React frontend application
│   ├── public/         # Static assets
│   └── src/            # React source code
│       ├── components/ # Reusable UI components
│       ├── contexts/   # React contexts
│       ├── layouts/    # Page layouts
│       ├── pages/      # Main application pages
│       ├── services/   # API services
│       ├── theme/      # UI theme configuration
│       ├── types/      # TypeScript type definitions
│       └── utils/      # Utility functions
├── inventory/          # Django app for inventory management
├── sales/              # Django app for sales tracking
├── iceplant_portal/    # Main Django project settings
└── templates/          # Django templates
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
