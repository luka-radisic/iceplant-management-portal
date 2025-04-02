from rest_framework import serializers
from .models import MaintenanceItem, MaintenanceRecord

class MaintenanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRecord
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

class MaintenanceItemSerializer(serializers.ModelSerializer):
    records = MaintenanceRecordSerializer(many=True, read_only=True)

    class Meta:
        model = MaintenanceItem
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at') 