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

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributors

- [Your Name] - Initial development