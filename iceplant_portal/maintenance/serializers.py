from rest_framework import serializers
from .models import MaintenanceItem, MaintenanceRecord

class MaintenanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRecord
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

class MaintenanceItemSerializer(serializers.ModelSerializer):
    records = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceItem
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
        
    def get_records(self, obj):
        # Get related records, ordered by most recent first
        records = obj.maintenancerecord_set.order_by('-maintenance_date')
        
        # Check if context has request info for pagination
        if self.context.get('request'):
            # Return only the 5 most recent records by default
            records = records[:5]
            
        return MaintenanceRecordSerializer(records, many=True).data 