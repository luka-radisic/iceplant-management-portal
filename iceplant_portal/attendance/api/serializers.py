from rest_framework import serializers
from attendance.models import Attendance, ImportLog, EmployeeShift, EmployeeProfile, DepartmentShift

class EmployeeProfileSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeProfile
        fields = [
            'employee_id',
            'full_name',
            'photo',
            'photo_url',
            'department',
            'position',
            'date_joined',
            'is_active',
            'track_shifts',
            'department_track_shifts',
        ]
        read_only_fields = ['photo_url']

    def get_photo_url(self, obj):
        if obj.photo:
            return self.context['request'].build_absolute_uri(obj.photo.url)
        return None

class AttendanceSerializer(serializers.ModelSerializer):
    duration = serializers.SerializerMethodField()
    has_hr_note = serializers.SerializerMethodField()
    
    class Meta:
        model = Attendance
        fields = '__all__'
    
    def get_duration(self, obj):
        if obj.duration:
            # Format duration as HH:MM:SS
            hours, remainder = divmod(obj.duration.total_seconds(), 3600)
            minutes, seconds = divmod(remainder, 60)
            return f"{int(hours):02}:{int(minutes):02}:{int(seconds):02}"
        return None

    def get_has_hr_note(self, obj):
        return bool(obj.hr_notes)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Re-introduce prefix stripping for display purposes
        prefix = "Atlantis Fishing Development Corp\\"
        department = data.get("department", "")
        if department and department.startswith(prefix):
            data["department"] = department[len(prefix):]
        return data

class ImportLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportLog
        fields = '__all__'

class DepartmentShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepartmentShift
        fields = [
            'department',
            'shift_start',
            'shift_end',
            'break_duration',
            'is_night_shift',
            'is_rotating_shift',
            'shift_duration',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at'] 