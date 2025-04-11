from django_filters import rest_framework as filters
from attendance.models import Attendance, EmployeeProfile, EmployeeShift, DepartmentShift
from django.db.models import Q
from django.db.models.functions import ExtractWeekDay

class AttendanceFilter(filters.FilterSet):
    approval_status = filters.CharFilter(method='filter_approval_status', label='Approval Status')
    checked = filters.BooleanFilter(field_name='checked')
    sunday_only = filters.BooleanFilter(method='filter_sunday_only', label='Sunday Only')

    def filter_sunday_only(self, queryset, name, value):
        """
        If sunday_only is True, filter records where check_in is a Sunday.
        """
        print(f"[DEBUG] sunday_only param value: {value}")
        if value:
            filtered = queryset.annotate(weekday=ExtractWeekDay('check_in')).filter(weekday=1)
            print(f"[DEBUG] Sunday filter applied, queryset count: {filtered.count()}")
            return filtered
        print(f"[DEBUG] Sunday filter not applied, queryset count: {queryset.count()}")
        return queryset
        return queryset
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

    def filter_approval_status(self, queryset, name, value):
        """
        Custom filter for approval_status:
        - If value is 'all', empty, or None, do not filter (return all records).
        - Otherwise, filter by case-insensitive exact match.
        """
        if value is None or value == "" or (isinstance(value, str) and value.lower() == "all"):
            return queryset
        return queryset.filter(**{f"{name}__iexact": value})

    class Meta:
        model = Attendance
        fields = ['employee_id', 'department', 'import_date', 'approval_status']

    def filter_department(self, queryset, name, value):
        # When filtering, check for both the cleaned name (value)
        # and the original prefixed name
        prefix = "Atlantis Fishing Development Corp\\"
        prefixed_value = prefix + value
        return queryset.filter(Q(department=value) | Q(department=prefixed_value)) 