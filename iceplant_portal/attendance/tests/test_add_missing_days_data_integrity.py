import pytz
from datetime import datetime, timedelta
from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from attendance.models import Attendance, EmployeeProfile

class AddMissingDaysDataIntegrityTestCase(TestCase):
    """
    Test cases for verifying database consistency and data integrity
    after using the Add Missing Days Tool.
    """
    
    def setUp(self):
        """Set up test data"""
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hruser',
            password='testpassword',
            email='hr@example.com'
        )
        hr_group = Group.objects.create(name='HR')
        self.hr_user.groups.add(hr_group)
        
        # Create test employees
        self.employees = []
        for i in range(1, 6):  # Create 5 test employees
            employee = EmployeeProfile.objects.create(
                employee_id=f"EMP{i}",
                full_name=f"Test Employee {i}",
                department="Test Department",
                is_active=True
            )
            self.employees.append(employee)
        
        # Set up API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.hr_user)
        
        # Get current date in Manila timezone
        self.manila_tz = pytz.timezone('Asia/Manila')
        self.today = datetime.now().astimezone(self.manila_tz).date()
        self.yesterday = self.today - timedelta(days=1)
        self.two_days_ago = self.today - timedelta(days=2)
        
        # URL for the add-missing-days endpoint
        self.url = '/api/attendance/attendance/add-missing-days/'
    
    def test_data_integrity_after_adding_missing_days(self):
        """
        Test that the database remains consistent after adding missing days.
        Verifies:
        1. No duplicate records are created
        2. Records have the correct schema and data
        3. Only missing days are added
        """
        # Create some existing attendance records
        # Employee 1 has attendance for today
        Attendance.objects.create(
            employee_id=self.employees[0].employee_id,
            employee_name=self.employees[0].full_name,
            check_in=self.manila_tz.localize(datetime.combine(self.today, datetime.min.time().replace(hour=8))),
            check_out=self.manila_tz.localize(datetime.combine(self.today, datetime.min.time().replace(hour=17))),
            department="Test Department",
            import_date=self.today
        )
        
        # Employee 2 has a NO SHOW record for yesterday
        Attendance.objects.create(
            employee_id=self.employees[1].employee_id,
            employee_name=self.employees[1].full_name,
            check_in=self.manila_tz.localize(datetime.combine(self.yesterday, datetime.min.time().replace(hour=8))),
            check_out=None,
            department="NO SHOW",
            import_date=self.yesterday
        )
        
        # Count initial records
        initial_count = Attendance.objects.count()
        
        # Run the add missing days tool for the last 3 days
        response = self.client.post(
            self.url,
            {
                'start_date': self.two_days_ago.strftime('%Y-%m-%d'),
                'end_date': self.today.strftime('%Y-%m-%d')
            },
            format='json'
        )
        
        # Verify response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Calculate expected number of new records:
        # - 5 employees x 3 days = 15 potential records
        # - Minus 1 record for Employee 1 on today
        # - Minus 1 record for Employee 2 on yesterday
        expected_new_records = 15 - 2
        
        # Verify the correct number of records were added
        self.assertEqual(data['added_count'], expected_new_records)
        
        # Verify total count in database
        final_count = Attendance.objects.count()
        self.assertEqual(final_count, initial_count + expected_new_records)
        
        # Verify no duplicates for any employee on any day
        for employee in self.employees:
            for day in [self.two_days_ago, self.yesterday, self.today]:
                count = Attendance.objects.filter(
                    employee_id=employee.employee_id,
                    check_in__date=day
                ).count()
                self.assertLessEqual(count, 1, f"Duplicate records found for {employee.employee_id} on {day}")
        
        # Verify schema and data of added NO SHOW records
        no_show_records = Attendance.objects.filter(department="NO SHOW")
        for record in no_show_records:
            # Check that check_in is at 8:00 AM
            check_in_time = record.check_in.astimezone(self.manila_tz).time()
            self.assertEqual(check_in_time.hour, 8)
            self.assertEqual(check_in_time.minute, 0)
            
            # Check that check_out is None
            self.assertIsNone(record.check_out)
            
            # Check that department is NO SHOW
            self.assertEqual(record.department, "NO SHOW")
            
            # Check that employee_id and employee_name match
            employee = EmployeeProfile.objects.get(employee_id=record.employee_id)
            self.assertEqual(record.employee_name, employee.full_name)
    
    def test_idempotency_with_multiple_runs(self):
        """
        Test that running the tool multiple times doesn't create duplicate records.
        """
        # Run the tool first time
        response1 = self.client.post(
            self.url,
            {
                'start_date': self.two_days_ago.strftime('%Y-%m-%d'),
                'end_date': self.today.strftime('%Y-%m-%d')
            },
            format='json'
        )
        
        # Count records after first run
        count_after_first = Attendance.objects.count()
        
        # Run the tool second time with same parameters
        response2 = self.client.post(
            self.url,
            {
                'start_date': self.two_days_ago.strftime('%Y-%m-%d'),
                'end_date': self.today.strftime('%Y-%m-%d')
            },
            format='json'
        )
        
        # Count records after second run
        count_after_second = Attendance.objects.count()
        
        # Verify counts are the same (no duplicates created)
        self.assertEqual(count_after_first, count_after_second)
        
        # Verify second response shows 0 added records
        data = response2.json()
        self.assertEqual(data['added_count'], 0)
    
    def test_data_integrity_with_inactive_employees(self):
        """
        Test that inactive employees are excluded from missing days.
        """
        # Make one employee inactive
        self.employees[4].is_active = False
        self.employees[4].save()
        
        # Run the add missing days tool
        response = self.client.post(
            self.url,
            {
                'start_date': self.today.strftime('%Y-%m-%d'),
                'end_date': self.today.strftime('%Y-%m-%d')
            },
            format='json'
        )
        
        # Verify no records were added for the inactive employee
        inactive_records = Attendance.objects.filter(
            employee_id=self.employees[4].employee_id,
            check_in__date=self.today
        )
        self.assertEqual(inactive_records.count(), 0)
    
    def test_data_integrity_after_delete_and_readd(self):
        """
        Test that deleting records and running the tool again only adds the deleted records.
        """
        # Run the tool first time
        self.client.post(
            self.url,
            {
                'start_date': self.today.strftime('%Y-%m-%d'),
                'end_date': self.today.strftime('%Y-%m-%d')
            },
            format='json'
        )
        
        # Delete records for employee 3
        Attendance.objects.filter(
            employee_id=self.employees[2].employee_id,
            check_in__date=self.today
        ).delete()
        
        # Count records before second run
        count_before_second = Attendance.objects.count()
        
        # Run the tool again
        response = self.client.post(
            self.url,
            {
                'start_date': self.today.strftime('%Y-%m-%d'),
                'end_date': self.today.strftime('%Y-%m-%d')
            },
            format='json'
        )
        
        # Verify only one record was added (for employee 3)
        data = response.json()
        self.assertEqual(data['added_count'], 1)
        
        # Verify the added record is for employee 3
        self.assertEqual(data['added_records'][0]['employee_id'], self.employees[2].employee_id)
        
        # Verify total count increased by 1
        count_after_second = Attendance.objects.count()
        self.assertEqual(count_after_second, count_before_second + 1)
    
    def test_data_integrity_with_department_filter(self):
        """
        Test that department filtering works correctly and maintains data integrity.
        """
        # Create employees in different departments
        dept_a_employee = EmployeeProfile.objects.create(
            employee_id="DEPT_A",
            full_name="Department A Employee",
            department="Department A",
            is_active=True
        )
        
        dept_b_employee = EmployeeProfile.objects.create(
            employee_id="DEPT_B",
            full_name="Department B Employee",
            department="Department B",
            is_active=True
        )
        
        # Run the tool with department filter
        response = self.client.post(
            self.url,
            {
                'start_date': self.today.strftime('%Y-%m-%d'),
                'end_date': self.today.strftime('%Y-%m-%d'),
                'department': "Department A"
            },
            format='json'
        )
        
        # Verify only records for Department A were added
        dept_a_records = Attendance.objects.filter(
            employee_id=dept_a_employee.employee_id,
            check_in__date=self.today
        )
        self.assertEqual(dept_a_records.count(), 1)
        
        dept_b_records = Attendance.objects.filter(
            employee_id=dept_b_employee.employee_id,
            check_in__date=self.today
        )
        self.assertEqual(dept_b_records.count(), 0)
    
    def test_data_integrity_with_weekends(self):
        """
        Test that weekend days are handled correctly.
        """
        # Find a weekend day (Saturday or Sunday)
        test_date = self.today
        while test_date.weekday() < 5:  # 5 = Saturday, 6 = Sunday
            test_date = test_date + timedelta(days=1)
        
        # Run the tool for the weekend day
        response = self.client.post(
            self.url,
            {
                'start_date': test_date.strftime('%Y-%m-%d'),
                'end_date': test_date.strftime('%Y-%m-%d')
            },
            format='json'
        )
        
        # Verify records were added for the weekend
        weekend_records = Attendance.objects.filter(
            check_in__date=test_date,
            department="NO SHOW"
        )
        self.assertEqual(weekend_records.count(), len(self.employees))