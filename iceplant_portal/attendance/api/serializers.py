from rest_framework import serializers
from attendance.models import Attendance, ImportLog

class AttendanceSerializer(serializers.ModelSerializer):
    duration = serializers.SerializerMethodField()
    
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

class ImportLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportLog
        fields = '__all__' 