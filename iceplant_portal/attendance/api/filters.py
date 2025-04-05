from django_filters import rest_framework as filters
from attendance.models import Attendance, EmployeeProfile, EmployeeShift, DepartmentShift
from django.db.models import Q

class AttendanceFilter(filters.FilterSet):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        prefix = "Atlantis Fishing Development Corp\\"

        profile_departments = list(
            EmployeeProfile.objects.values_list('department', flat=True).distinct()
        )
        attendance_departments = list(
            Attendance.objects.values_list('department', flat=True).distinct()
        )
        shift_departments = list(
            EmployeeShift.objects.values_list('department', flat=True).distinct()
        )
        dept_shift_departments = list(
            DepartmentShift.objects.values_list('department', flat=True).distinct()
        )

        all_departments = (
            profile_departments
            + attendance_departments
            + shift_departments
            + dept_shift_departments
        )

        cleaned_departments = set()
        for dept in all_departments:
            if not dept:
                continue
            # Strip prefix for the choices
            if dept.startswith(prefix):
                dept = dept[len(prefix):]
            cleaned_departments.add(dept)

        known_departments = ['Driver', 'Office', 'Harvester', 'Operator', 'Sales', 'Admin', 'HR']
        cleaned_departments.update(known_departments)

        final_departments = sorted(
            d for d in cleaned_departments if d and not d.isdigit()
        )

        # Set choices using cleaned names
        self.filters['department'].extra['choices'] = [(d, d) for d in final_departments]

    department = filters.ChoiceFilter(method='filter_department', label='Department')

    class Meta:
        model = Attendance
        fields = ['employee_id', 'department', 'import_date']

    def filter_department(self, queryset, name, value):
        # When filtering, check for both the cleaned name (value)
        # and the original prefixed name
        prefix = "Atlantis Fishing Development Corp\\"
        prefixed_value = prefix + value
        return queryset.filter(Q(department=value) | Q(department=prefixed_value)) 