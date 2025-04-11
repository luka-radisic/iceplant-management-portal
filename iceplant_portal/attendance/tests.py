from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from attendance.models import Attendance
from datetime import datetime, timedelta

class AttendanceSundayFilterTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create a Sunday record (2023-04-09 is a Sunday)
        self.sunday_checkin = timezone.make_aware(datetime(2023, 4, 9, 8, 0, 0))
        self.sunday_attendance = Attendance.objects.create(
            employee_id="E001",
            employee_name="Sunday Employee",
            check_in=self.sunday_checkin
        )
        # Create a Monday record (2023-04-10 is a Monday)
        self.monday_checkin = timezone.make_aware(datetime(2023, 4, 10, 8, 0, 0))
        self.monday_attendance = Attendance.objects.create(
            employee_id="E002",
            employee_name="Monday Employee",
            check_in=self.monday_checkin
        )

    def test_sunday_only_filter(self):
        response = self.client.get("/api/attendance/attendance/", {"sunday_only": "true"})
        self.assertEqual(response.status_code, 200)
        # Should only return the Sunday record
        results = response.json()
        # If paginated, results may be in 'results' key
        if isinstance(results, dict) and "results" in results:
            results = results["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["employee_id"], "E001")
        self.assertEqual(results[0]["employee_name"], "Sunday Employee")
