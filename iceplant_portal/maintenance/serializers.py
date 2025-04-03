from rest_framework import serializers
from .models import MaintenanceItem, MaintenanceRecord

# Define a simple serializer for the nested item data needed
class MaintenanceItemNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceItem
        fields = ('id', 'equipment_name') # Only include ID and name

class MaintenanceRecordSerializer(serializers.ModelSerializer):
    # Add the nested serializer field
    maintenance_item = MaintenanceItemNestedSerializer(read_only=True)
    # Explicitly add maintenance_item_id for writing if needed when creating/updating
    maintenance_item_id = serializers.PrimaryKeyRelatedField(
        queryset=MaintenanceItem.objects.all(), 
        source='maintenance_item', 
        write_only=True,
        allow_null=True # Allow setting it to null if applicable
    )

    class Meta:
        model = MaintenanceRecord
        # Update fields list to include the nested representation
        fields = [
            'id', 'maintenance_item', 'maintenance_item_id', 'maintenance_date', 
            'maintenance_type', 'performed_by', 'cost', 'parts_replaced', 
            'duration', 'issues_found', 'actions_taken', 'recommendations', 
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ('id', 'created_at', 'updated_at', 'maintenance_item')

class MaintenanceItemSerializer(serializers.ModelSerializer):
    records = MaintenanceRecordSerializer(many=True, read_only=True)

    class Meta:
        model = MaintenanceItem
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at') 