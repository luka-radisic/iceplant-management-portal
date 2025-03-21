# IcePlant Management Portal

A comprehensive web application for managing Ice Plant operations, including time and attendance tracking, sales management, inventory control, and expense tracking.

## Features

- **Time and Attendance Management**
  - Import XLSX files from check-in system
  - Track employee check-in/check-out times
  - Calculate working hours
  - Handle department assignments

- **Sales Management**
  - Record ice block sales with quantity and brine level
  - Track buyer information and payment methods
  - Search and filter sales records
  - Generate sales reports

- **Inventory Management**
  - Track ice block stock levels
  - Monitor raw materials (water, salt)
  - Low stock alerts
  - Inventory adjustment records

- **Expense Tracking**
  - Record and categorize expenses
  - Track vendors and payment details
  - Upload receipts
  - Generate expense reports

## Technology Stack

- **Backend**: Django / Django REST Framework
- **Database**: SQLite (Development) / PostgreSQL (Production)
- **Frontend**: React.js (Coming soon)
- **File Processing**: Pandas for XLSX handling
- **PDF Generation**: ReportLab for reports

## Setup Instructions

### Backend Setup

1. Clone the repository
   ```
   git clone <repository-url>
   cd iceplant_portal
   ```

2. Create and activate a virtual environment
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies
   ```
   pip install -r requirements.txt
   ```

4. Apply migrations
   ```
   python manage.py migrate
   ```

5. Create a superuser (for admin access)
   ```
   python manage.py createsuperuser
   ```

6. Run the development server
   ```
   python manage.py runserver
   ```

7. Access the admin interface at http://127.0.0.1:8000/admin/

### Frontend Setup (Coming Soon)

The React frontend will be available in a future update.

## API Endpoints

The application provides RESTful API endpoints for all functionality:

- `/api/attendance/` - Time and attendance management
- `/api/sales/` - Sales records management
- `/api/inventory/` - Inventory management
- `/api/expenses/` - Expense tracking

## GitHub Operations and Automation

### Version Control

1. **Basic Git Commands**
   ```bash
   # Clone the repository
   git clone <repository-url>
   
   # Check status of your changes
   git status
   
   # Add changes to staging
   git add .
   
   # Commit changes
   git commit -m "Your descriptive commit message"
   
   # Push changes to GitHub
   git push origin main
   ```

2. **Branch Management**
   ```bash
   # Create and switch to a new branch
   git checkout -b feature/your-feature-name
   
   # Switch between branches
   git checkout main
   
   # Merge changes from another branch
   git merge feature/your-feature-name
   ```

### Automated Backups

The project includes two backup solutions:

1. **GitHub Actions Workflow** (`/.github/workflows/backup.yml`)
   - Runs automatically at 1:00 AM UTC daily
   - Creates JSON dump of the database
   - Stores backup as GitHub artifact
   - Retains backups for 30 days
   - Can be triggered manually from GitHub Actions tab

2. **Local Backup Script** (`backup.py`)
   ```bash
   # Run backup with default settings
   python backup.py
   
   # Specify custom backup directory and retention period
   python backup.py --backup-dir /path/to/backup --days-to-keep 45
   ```

   Features:
   - Creates timestamped database backups
   - Automatically cleans up old backups
   - Configurable backup location and retention period
   - Returns non-zero exit code on failure

### Cron Job Setup (Local Backups)

1. **View current cron jobs**
   ```bash
   crontab -l
   ```

2. **Edit cron jobs**
   ```bash
   crontab -e
   ```

3. **Add backup schedule (example: daily at 2 AM)**
   ```bash
   0 2 * * * cd /path/to/iceplant_portal && venv/bin/python backup.py
   ```

### Environment Configuration

1. **Setup environment variables**
   ```bash
   # Copy example environment file
   cp .env.example .env
   
   # Edit .env file with your settings
   nano .env
   ```

2. **Required environment variables**
   - `DEBUG`: Set to False in production
   - `SECRET_KEY`: Your Django secret key
   - `DJANGO_ALLOWED_HOSTS`: Comma-separated list of allowed hosts
   - `DB_*`: Database connection settings
   - `EMAIL_*`: Email server configuration

### Deployment Automation

The project includes Docker configuration for automated deployment:

1. **Build and run with Docker Compose**
   ```bash
   # Start services
   docker-compose up -d
   
   # View logs
   docker-compose logs
   
   # Stop services
   docker-compose down
   ```

2. **Container Features**
   - Automatic database migrations
   - Static files collection
   - PostgreSQL database service
   - Volume management for persistence
   - Environment variable configuration

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributors

- [Your Name] - Initial development