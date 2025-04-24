import os
import pandas as pd
import io
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, render_template, request, send_file, redirect, url_for, flash, session, jsonify
from werkzeug.utils import secure_filename
from dateutil.rrule import rrule, DAILY

# Import project modules
from db_interface import AttendanceDatabase
from data_cleaner import clean_attendance_data, analyze_attendance_data
from attendance_parser import AtlantisAttendanceParser
import file_utils
import date_utils

# Import the backup utilities
from backup_utils import backup_database, create_full_backup, get_available_backups

# Import the new import handlers
from import_handlers import import_file_to_db, detect_file_type

# Ensure static directory exists
STATIC_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
os.makedirs(os.path.join(STATIC_FOLDER, 'css'), exist_ok=True)

# Create Flask app
app = Flask(__name__, static_folder=STATIC_FOLDER)

# Load configuration
from config import Config
app.config.from_object(Config)

# Add context processor to inject current year and now function
@app.context_processor
def inject_utility_functions():
    def now(fmt='%Y'):
        """Return current time formatted according to fmt."""
        return datetime.now().strftime(fmt)
        
    return {
        'current_year': datetime.now().year,
        'now': now
    }

# Initialize database
db = AttendanceDatabase()

# Ensure upload directory exists
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload

# Allowed extensions
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv', 'pdf'}
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Helper function to check login status
def is_logged_in():
    return session.get('logged_in', False)

# Home page route
@app.route('/')
def index():
    # Get database statistics
    stats = db.get_attendance_summary()
    
    # Get recent employees (limit to 5)
    recent_employees = db.get_all_employees()[:5]
    
    return render_template('index.html', 
                          stats=stats, 
                          recent_employees=recent_employees)

# Login route
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if (username == app.config['ADMIN_USERNAME'] and 
            password == app.config['ADMIN_PASSWORD']):
            session['logged_in'] = True
            flash('Login successful!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Invalid credentials. Please try again.', 'danger')
    
    return render_template('login.html')

# Logout route
@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

# Import data page
@app.route('/import', methods=['GET', 'POST'])
def import_data():
    if request.method == 'POST':
        if 'excel_file' not in request.files:
            flash('No file part', 'danger')
            return redirect(request.url)
        
        file = request.files['excel_file']
        
        if file.filename == '':
            flash('No selected file', 'danger')
            return redirect(request.url)
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            try:
                # Get the import type from form if specified
                import_type = request.form.get('import_type', 'auto')
                if import_type == 'auto':
                    import_type = None
                
                # Check if we should auto-fill missing days
                auto_fill_gaps = request.form.get('auto_fill_gaps') == 'on'
                
                # Use the unified import handler with auto-fill option
                success, message, stats = import_file_to_db(
                    file_path, 
                    import_type=import_type,
                    auto_fill_gaps=auto_fill_gaps
                )
                
                # Clean up the uploaded file
                try:
                    os.remove(file_path)
                except:
                    pass
                
                if success:
                    if auto_fill_gaps and stats and stats.get('gaps_filled', 0) > 0:
                        message += f" ({stats['gaps_filled']} days marked as No Work/Weekend)"
                    flash(message, 'success')
                    return redirect(url_for('index'))
                else:
                    flash(message, 'danger')
                    return redirect(url_for('import_data'))
                
            except Exception as e:
                flash(f'Error processing file: {str(e)}', 'danger')
                return redirect(url_for('import_data'))
        else:
            flash(f'Invalid file type. Please upload Excel or PDF files only.', 'warning')
            return redirect(url_for('import_data'))
    
    # Show import form for GET request
    return render_template('import.html')

@app.route('/search', methods=['GET', 'POST'])
def search():
    results = []
    search_term = ""
    department_filter = ""
    
    # Get departments with error handling
    try:
        departments = db.get_departments()
        if not departments:
            departments = []
            logger.warning("No departments found in database")
    except Exception as e:
        departments = []
        logger.error(f"Error retrieving departments: {str(e)}")
    
    if request.method == 'POST':
        search_term = request.form.get('search_term', '')
        department_filter = request.form.get('department', '')
        
        if search_term or department_filter:
            results = db.search_employees(search_term, department_filter)
    
    return render_template('search.html', 
                          results=results, 
                          search_term=search_term,
                          department_filter=department_filter,
                          departments=departments)

# Employee detail page
@app.route('/employee/<employee_id>')
def employee_detail(employee_id):
    # Get employee information
    employees = db.search_employees(employee_id)
    if not employees:
        flash('Employee not found', 'danger')
        return redirect(url_for('search'))
    
    employee = employees[0]
    
    # Get attendance records for this employee
    # Default to most recent month if no date range specified
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    attendance_records = db.get_attendance_records(
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
        limit=500
    )
    
    # Get summary statistics
    stats = db.get_attendance_summary(employee_id=employee_id, 
                                     start_date=start_date,
                                     end_date=end_date)
    
    return render_template('employee_detail.html',
                          employee=employee,
                          records=attendance_records,
                          stats=stats,
                          start_date=start_date,
                          end_date=end_date)

@app.route('/reports')
def report():
    # Get filter parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    employee_id = request.args.get('employee_id')
    status = request.args.get('status')
    department = request.args.get('department')
    
    # Get all employees for the filter dropdown
    all_employees = db.get_all_employees()
    
    # Get all departments with error handling
    try:
        departments = db.get_departments()
    except Exception as e:
        departments = []
        logger.error(f"Error retrieving departments: {str(e)}")
    
    # Get attendance records based on filters
    try:
        records = db.get_attendance_records(
            employee_id=employee_id,
            start_date=start_date,
            end_date=end_date,
            department=department,
            limit=1000
        )
        
        # Filter by status if specified
        if status and records:
            records = [r for r in records if r.get('status') == status]
    except Exception as e:
        records = []
        logger.error(f"Error retrieving attendance records: {str(e)}")
    
    # Get summary statistics
    stats = db.get_attendance_summary(
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return render_template('report.html',
                          records=records,
                          stats=stats,
                          employees=all_employees,
                          departments=departments,
                          filters={
                              'start_date': start_date,
                              'end_date': end_date,
                              'employee_id': employee_id,
                              'status': status,
                              'department': department
                          })

# Export report to Excel
@app.route('/export_report')
def export_report():
    # Get filter parameters (same as report page)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    employee_id = request.args.get('employee_id')
    status = request.args.get('status')
    
    # Get attendance records based on filters
    records = db.get_attendance_records(
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
        limit=5000  # Higher limit for exports
    )
    
    # Filter by status if specified
    if status and records:
        records = [r for r in records if r.get('status') == status]
    
    if not records:
        flash('No records found to export', 'warning')
        return redirect(url_for('report'))
    
    # Convert to DataFrame
    df = pd.DataFrame(records)
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Attendance Records')
    output.seek(0)
    
    # Generate filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"attendance_report_{timestamp}.xlsx"
    
    return send_file(
        output,
        as_attachment=True,
        download_name=filename,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

# Database admin page (requires login)
@app.route('/admin/database')
def database_admin():
    if not is_logged_in():
        flash('Please login to access this page', 'warning')
        return redirect(url_for('login'))
    
    # Get database statistics
    stats = db.get_attendance_summary()
    employee_count = len(db.get_all_employees())
    
    return render_template('admin/database.html',
                          stats=stats,
                          employee_count=employee_count)

# Database purge action
@app.route('/admin/purge_database', methods=['POST'])
def purge_database():
    if not is_logged_in():
        flash('Please login to access this function', 'danger')
        return redirect(url_for('login'))
    
    confirmation = request.form.get('confirmation')
    if confirmation != 'DELETE-ALL-DATA':
        flash('Invalid confirmation text. Database was not purged.', 'danger')
        return redirect(url_for('database_admin'))
    
    try:
        # Create a temporary connection to delete all data
        conn = sqlite3.connect(db.db_path)
        cursor = conn.cursor()
        
        # Delete all records from attendance table
        cursor.execute("DELETE FROM attendance")
        attendance_count = cursor.rowcount
        
        # Delete all records from employees table
        cursor.execute("DELETE FROM employees")
        employee_count = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        flash(f'Database purged successfully. Removed {attendance_count} attendance records and {employee_count} employees.', 'success')
    except Exception as e:
        flash(f'Error purging database: {str(e)}', 'danger')
    
    return redirect(url_for('database_admin'))

# Fix database structure
@app.route('/admin/fix_database')
def fix_database():
    if not is_logged_in():
        flash('Please login to access this function', 'danger')
        return redirect(url_for('login'))
    
    try:
        from fix_database import backup_database, add_missing_columns
        
        # Create a backup
        backup_database()
        
        # Fix database structure
        add_missing_columns()
        
        flash('Database structure fixed successfully', 'success')
    except Exception as e:
        flash(f'Error fixing database: {str(e)}', 'danger')
    
    return redirect(url_for('database_admin'))

# Add the new backup-related routes
@app.route('/admin/backup')
def backup_admin():
    """Admin page for database backups."""
    if not is_logged_in():
        flash('Please login to access this function', 'danger')
        return redirect(url_for('login'))
    
    # Get list of available backups
    backups = get_available_backups()
    
    return render_template('admin/backup.html', backups=backups)

@app.route('/admin/backup/create', methods=['POST'])
def create_backup():
    """Create a new backup."""
    if not is_logged_in():
        flash('Please login to access this function', 'danger')
        return redirect(url_for('login'))
    
    backup_type = request.form.get('backup_type', 'database')
    
    if backup_type == 'full':
        success, message, path = create_full_backup()
    else:
        success, message, path = backup_database()
    
    if success:
        flash(message, 'success')
    else:
        flash(message, 'danger')
    
    return redirect(url_for('backup_admin'))

@app.route('/admin/backup/download/<filename>')
def download_backup(filename):
    """Download a backup file."""
    if not is_logged_in():
        flash('Please login to access this function', 'danger')
        return redirect(url_for('login'))
    
    backup_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')
    return send_file(os.path.join(backup_dir, filename), as_attachment=True)

# Weekend Work report page
@app.route('/weekend-work')
def weekend_work():
    conn = None
    try:
        conn = sqlite3.connect(db.db_path)
        
        # Query to find all Weekend Work records
        query = """
        SELECT e.name as employee_name, a.*
        FROM attendance a
        JOIN employees e ON a.employee_id = e.employee_id
        WHERE a.status = 'Weekend Work'
        ORDER BY a.date DESC, e.name
        """
        
        # Execute query
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(query)
        records = [dict(row) for row in cursor.fetchall()]
        
        # Get summary statistics
        stats = {
            'total_records': len(records),
            'employees': len(set(r['employee_id'] for r in records))
        }
        
        if records:
            dates = [r['date'] for r in records]
            stats['date_range'] = (min(dates), max(dates))
        else:
            stats['date_range'] = (None, None)
            
        return render_template('weekend_work.html', records=records, stats=stats)
    
    except Exception as e:
        flash(f"Error retrieving weekend work records: {str(e)}", "danger")
        return redirect(url_for('index'))
    finally:
        if conn:
            conn.close()

# Utility function to fill missing workdays
def fill_missing_workdays(employee_id=None, start_date=None, end_date=None):
    """
    Fill missing workdays in the attendance records with 'No Work' status.
    For weekends with no records, add 'Weekend' status.
    
    Args:
        employee_id: Optional employee ID to process specific employee
        start_date: Optional start date for processing
        end_date: Optional end date for processing
        
    Returns:
        dict: Statistics about records added
    """
    conn = None
    try:
        conn = sqlite3.connect(db.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        stats = {
            'total_added': 0,
            'no_work_added': 0,
            'weekend_added': 0,
            'employees_processed': 0
        }
        
        # Get all employees or specific employee
        if employee_id:
            cursor.execute("SELECT * FROM employees WHERE employee_id = ?", (employee_id,))
        else:
            cursor.execute("SELECT * FROM employees")
        
        employees = [dict(row) for row in cursor.fetchall()]
        
        for employee in employees:
            emp_id = employee['employee_id']
            
            # Get date range for this employee
            date_query = """
            SELECT MIN(date) as first_date, MAX(date) as last_date 
            FROM attendance 
            WHERE employee_id = ?
            """
            params = [emp_id]
            
            if start_date:
                date_query += " AND date >= ?"
                params.append(start_date)
                
            if end_date:
                date_query += " AND date <= ?"
                params.append(end_date)
                
            cursor.execute(date_query, params)
            date_range = cursor.fetchone()
            
            if not date_range or not date_range['first_date'] or not date_range['last_date']:
                continue  # Skip if no records found
            
            # Parse dates
            try:
                first_date = datetime.strptime(date_range['first_date'], '%Y-%m-%d')
                last_date = datetime.strptime(date_range['last_date'], '%Y-%m-%d')
            except:
                # Try alternative format
                try:
                    first_date = datetime.strptime(date_range['first_date'], '%Y/%m/%d')
                    last_date = datetime.strptime(date_range['last_date'], '%Y/%m/%d')
                except:
                    continue  # Skip if date parsing fails
            
            # Override with provided dates if specified
            if start_date:
                try:
                    override_start = datetime.strptime(start_date, '%Y-%m-%d')
                    if override_start > first_date:
                        first_date = override_start
                except:
                    pass
                    
            if end_date:
                try:
                    override_end = datetime.strptime(end_date, '%Y-%m-%d')
                    if override_end < last_date:
                        last_date = override_end
                except:
                    pass
            
            # Get existing dates for this employee
            cursor.execute("""
                SELECT date FROM attendance 
                WHERE employee_id = ? AND date >= ? AND date <= ?
            """, (emp_id, first_date.strftime('%Y-%m-%d'), last_date.strftime('%Y-%m-%d')))
            
            existing_dates = set(row['date'] for row in cursor.fetchall())
            
            # Generate all dates in range
            all_dates = []
            for dt in rrule(DAILY, dtstart=first_date, until=last_date):
                all_dates.append(dt.strftime('%Y-%m-%d'))
            
            # Find missing dates
            missing_dates = set(all_dates) - existing_dates
            
            # Insert missing dates with appropriate status
            for date_str in missing_dates:
                # Determine if it's a weekend
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                day_of_week = date_obj.strftime('%a')
                weekday = date_obj.weekday()
                
                if weekday >= 5:  # 5=Saturday, 6=Sunday
                    status = 'Weekend'
                    stats['weekend_added'] += 1
                else:
                    status = 'No Work'
                    stats['no_work_added'] += 1
                
                # Insert record
                cursor.execute("""
                    INSERT INTO attendance 
                    (employee_id, date, day, status) 
                    VALUES (?, ?, ?, ?)
                """, (emp_id, date_str, day_of_week, status))
                
                stats['total_added'] += 1
            
            stats['employees_processed'] += 1
        
        # Commit changes
        conn.commit()
        return stats
        
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error filling missing workdays: {str(e)}")
        raise e
    finally:
        if conn:
            conn.close()

# Add route to fill missing workdays
@app.route('/admin/fill-missing-workdays', methods=['GET', 'POST'])
def admin_fill_workdays():
    """Admin page to fill missing workdays in attendance records."""
    if not is_logged_in():
        flash('Please login to access this function', 'danger')
        return redirect(url_for('login'))
    
    stats = None
    
    if request.method == 'POST':
        employee_id = request.form.get('employee_id')
        if employee_id == '':
            employee_id = None
            
        start_date = request.form.get('start_date')
        if start_date == '':
            start_date = None
            
        end_date = request.form.get('end_date')
        if end_date == '':
            end_date = None
        
        try:
            stats = fill_missing_workdays(
                employee_id=employee_id,
                start_date=start_date,
                end_date=end_date
            )
            
            flash(f"Successfully added {stats['total_added']} missing attendance records ({stats['no_work_added']} workdays, {stats['weekend_added']} weekends) for {stats['employees_processed']} employees", 'success')
        except Exception as e:
            flash(f"Error filling missing workdays: {str(e)}", 'danger')
    
    # Get all employees for the dropdown
    employees = db.get_all_employees()
    
    return render_template('admin/fill_workdays.html',
                          employees=employees,
                          stats=stats)

# Custom error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

# Command line interface
if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Run the TimeAttendance Exporter web app')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    parser.add_argument('--port', type=int, default=5000, help='Port to run the server on')
    parser.add_argument('--host', default='127.0.0.1', help='Host to run the server on')
    args = parser.parse_args()
    
    # Run the Flask app
    app.run(debug=args.debug, host=args.host, port=args.port)
