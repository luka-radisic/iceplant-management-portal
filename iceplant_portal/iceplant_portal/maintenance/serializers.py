from rest_framework import serializers
from .models import MaintenanceItem, MaintenanceRecord

class MaintenanceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceItem
        fields = '__all__'

class MaintenanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRecord
        fields = '__all__' 