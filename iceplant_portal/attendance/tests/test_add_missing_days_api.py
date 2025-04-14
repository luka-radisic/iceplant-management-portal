import json
from datetime import datetime, timedelta
import pytz
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User, Group
from attendance.models import Attendance, EmployeeProfile

class AddMissingDaysAPITestCase(TestCase):
    """Test cases for the Add Missing Days API endpoint"""
    
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
        
        # Create regular user
        self.regular_user = User.objects.create_user(
            username='regularuser',
            password='testpassword',
            email='regular@example.com'
        )
        
        # Create test employees
        self.employees = []
        for i in range(1, 4):  # Create 3 test employees
            employee = EmployeeProfile.objects.create(
                employee_id=f"EMP{i}",
                full_name=f"Test Employee {i}",
                department="Test Department",
                is_active=True
            )
            self.employees.append(employee)
        
        # Create some existing attendance records
        manila_tz = pytz.timezone('Asia/Manila')
        today = datetime.now().astimezone(manila_tz).date()
        yesterday = today - timedelta(days=1)
        
        # Employee 1 has attendance for today
        Attendance.objects.create(
            employee_id=self.employees[0].employee_id,
            employee_name=self.employees[0].full_name,
            check_in=manila_tz.localize(datetime.combine(today, datetime.min.time().replace(hour=8))),
            check_out=manila_tz.localize(datetime.combine(today, datetime.min.time().replace(hour=17))),
            department="Test Department",
            import_date=today
        )
        
        # Employee 2 has attendance for yesterday
        Attendance.objects.create(
            employee_id=self.employees[1].employee_id,
            employee_name=self.employees[1].full_name,
            check_in=manila_tz.localize(datetime.combine(yesterday, datetime.min.time().replace(hour=8))),
            check_out=manila_tz.localize(datetime.combine(yesterday, datetime.min.time().replace(hour=17))),
            department="Test Department",
            import_date=yesterday
        )
        
        # Employee 3 has no attendance records
        
        # Set up API client
        self.client = APIClient()
        self.url = reverse('attendance-add-missing-days')
    
    def test_authentication_required(self):
        """Test that authentication is required to access the endpoint"""
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_add_missing_days_for_date_range(self):
        """Test adding missing days for a specific date range"""
        self.client.force_authenticate(user=self.hr_user)
        
        manila_tz = pytz.timezone('Asia/Manila')
        today = datetime.now().astimezone(manila_tz).date()
        yesterday = today - timedelta(days=1)
        
        # Request to add missing days for yesterday and today
        response = self.client.post(
            self.url,
            {
                'start_date': yesterday.strftime('%Y-%m-%d'),
                'end_date': today.strftime('%Y-%m-%d')
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check response data
        data = response.json()
        self.assertIn('added_count', data)
        self.assertIn('added_records', data)
        self.assertIn('checked_dates', data)
        
        # We should have 3 added records:
        # - Employee 1 missing yesterday
        # - Employee 2 missing today
        # - Employee 3 missing both yesterday and today
        expected_count = 3
        self.assertEqual(data['added_count'], expected_count)
        
        # Check that the records were actually created in the database
        # Employee 1 should now have a NO SHOW record for yesterday
        self.assertTrue(
            Attendance.objects.filter(
                employee_id=self.employees[0].employee_id,
                check_in__date=yesterday,
                department='NO SHOW'
            ).exists()
        )
        
        # Employee 2 should now have a NO SHOW record for today
        self.assertTrue(
            Attendance.objects.filter(
                employee_id=self.employees[1].employee_id,
                check_in__date=today,
                department='NO SHOW'
            ).exists()
        )
        
        # Employee 3 should have NO SHOW records for both days
        self.assertTrue(
            Attendance.objects.filter(
                employee_id=self.employees[2].employee_id,
                check_in__date=yesterday,
                department='NO SHOW'
            ).exists()
        )
        self.assertTrue(
            Attendance.objects.filter(
                employee_id=self.employees[2].employee_id,
                check_in__date=today,
                department='NO SHOW'
            ).exists()
        )
    
    def test_idempotency(self):
        """Test that running the endpoint multiple times doesn't create duplicate records"""
        self.client.force_authenticate(user=self.hr_user)
        
        manila_tz = pytz.timezone('Asia/Manila')
        today = datetime.now().astimezone(manila_tz).date()
        
        # First request
        response1 = self.client.post(
            self.url,
            {
                'start_date': today.strftime('%Y-%m-%d'),
                'end_date': today.strftime('%Y-%m-%d')
            },
            format='json'
        )
        
        # Count records after first request
        count_after_first = Attendance.objects.filter(
            check_in__date=today,
            department='NO SHOW'
        ).count()
        
        # Second request with same parameters
        response2 = self.client.post(
            self.url,
            {
                'start_date': today.strftime('%Y-%m-%d'),
                'end_date': today.strftime('%Y-%m-%d')
            },
            format='json'
        )
        
        # Count records after second request
        count_after_second = Attendance.objects.filter(
            check_in__date=today,
            department='NO SHOW'
        ).count()
        
        # Counts should be the same (no duplicates created)
        self.assertEqual(count_after_first, count_after_second)
        
        # Second response should show 0 added records
        data = response2.json()
        self.assertEqual(data['added_count'], 0)
    
    def test_dry_run_mode(self):
        """Test that dry_run mode doesn't actually create records"""
        self.client.force_authenticate(user=self.hr_user)
        
        manila_tz = pytz.timezone('Asia/Manila')
        today = datetime.now().astimezone(manila_tz).date()
        
        # Count records before request
        count_before = Attendance.objects.filter(
            check_in__date=today,
            department='NO SHOW'
        ).count()
        
        # Request with dry_run=true
        response = self.client.post(
            self.url,
            {
                'start_date': today.strftime('%Y-%m-%d'),
                'end_date': today.strftime('%Y-%m-%d'),
                'dry_run': True
            },
            format='json'
        )
        
        # Count records after request
        count_after = Attendance.objects.filter(
            check_in__date=today,
            department='NO SHOW'
        ).count()
        
        # Counts should be the same (no records created)
        self.assertEqual(count_before, count_after)
        
        # Response should still show what would be added
        data = response.json()
        self.assertIn('added_count', data)
        self.assertIn('added_records', data)
    
    def test_invalid_date_format(self):
        """Test that invalid date formats return appropriate error"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.post(
            self.url,
            {
                'start_date': 'invalid-date',
                'end_date': '2025-04-15'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.json())
    
    def test_start_date_after_end_date(self):
        """Test that start_date after end_date returns appropriate error"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.post(
            self.url,
            {
                'start_date': '2025-04-15',
                'end_date': '2025-04-01'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.json())
    
    def test_filter_by_employee(self):
        """Test that filtering by employee_id works correctly"""
        self.client.force_authenticate(user=self.hr_user)
        
        manila_tz = pytz.timezone('Asia/Manila')
        today = datetime.now().astimezone(manila_tz).date()
        
        # Request to add missing days for specific employee
        response = self.client.post(
            self.url,
            {
                'start_date': today.strftime('%Y-%m-%d'),
                'end_date': today.strftime('%Y-%m-%d'),
                'employee_id': self.employees[2].employee_id
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that only records for the specified employee were added
        data = response.json()
        self.assertEqual(len(data['added_records']), 1)
        self.assertEqual(data['added_records'][0]['employee_id'], self.employees[2].employee_id)
    
    def test_filter_by_department(self):
        """Test that filtering by department works correctly"""
        self.client.force_authenticate(user=self.hr_user)
        
        # Create an employee in a different department
        other_dept_employee = EmployeeProfile.objects.create(
            employee_id="EMP_OTHER",
            full_name="Other Department Employee",
            department="Other Department",
            is_active=True
        )
        
        manila_tz = pytz.timezone('Asia/Manila')
        today = datetime.now().astimezone(manila_tz).date()
        
        # Request to add missing days for specific department
        response = self.client.post(
            self.url,
            {
                'start_date': today.strftime('%Y-%m-%d'),
                'end_date': today.strftime('%Y-%m-%d'),
                'department': "Other Department"
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that only records for the specified department were added
        data = response.json()
        self.assertEqual(len(data['added_records']), 1)
        self.assertEqual(data['added_records'][0]['employee_id'], other_dept_employee.employee_id)
    
    def test_inactive_employees_excluded(self):
        """Test that inactive employees are excluded from missing days"""
        # Create an inactive employee
        inactive_employee = EmployeeProfile.objects.create(
            employee_id="EMP_INACTIVE",
            full_name="Inactive Employee",
            department="Test Department",
            is_active=False
        )
        
        self.client.force_authenticate(user=self.hr_user)
        
        manila_tz = pytz.timezone('Asia/Manila')
        today = datetime.now().astimezone(manila_tz).date()
        
        # Request to add missing days
        response = self.client.post(
            self.url,
            {
                'start_date': today.strftime('%Y-%m-%d'),
                'end_date': today.strftime('%Y-%m-%d')
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that no records were added for the inactive employee
        self.assertFalse(
            Attendance.objects.filter(
                employee_id=inactive_employee.employee_id,
                check_in__date=today
            ).exists()
        )