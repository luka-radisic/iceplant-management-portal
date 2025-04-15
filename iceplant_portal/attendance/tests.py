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


class AttendanceMissingDayEditTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create a record with Check In = 23:56 (missing day placeholder)
        self.employee_id = "E999"
        self.check_in_placeholder = timezone.make_aware(datetime(2023, 4, 11, 23, 56, 0))
        self.attendance = Attendance.objects.create(
            employee_id=self.employee_id,
            employee_name="Missing Day Employee",
            check_in=self.check_in_placeholder
        )

    def test_edit_missing_day_check_in_and_out(self):
        # New Check In and Check Out values
        new_check_in = timezone.make_aware(datetime(2023, 4, 11, 8, 0, 0))
        new_check_out = timezone.make_aware(datetime(2023, 4, 11, 17, 0, 0))
        url = f"/api/attendance/attendance/{self.attendance.id}/"
        response = self.client.patch(url, {
            "check_in": new_check_in.isoformat(),
            "check_out": new_check_out.isoformat()
        }, format="json")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        # Check that the values were updated
        self.assertIn("check_in", data)
        self.assertIn("check_out", data)
        self.assertTrue(data["check_in"].startswith("2023-04-11T08:00"))
        self.assertTrue(data["check_out"].startswith("2023-04-11T17:00"))
        # Confirm in DB
        self.attendance.refresh_from_db()
        self.assertEqual(self.attendance.check_in.hour, 8)
        self.assertEqual(self.attendance.check_out.hour, 17)

        self.assertEqual(results[0]["employee_name"], "Sunday Employee")
