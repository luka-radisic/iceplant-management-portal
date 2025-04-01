from rest_framework import serializers
from inventory.models import Inventory, InventoryAdjustment

class InventorySerializer(serializers.ModelSerializer):
    is_low = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Inventory
        fields = '__all__'

class InventoryAdjustmentSerializer(serializers.ModelSerializer):
    inventory_name = serializers.CharField(source='inventory.item_name', read_only=True)
    previous_quantity = serializers.IntegerField(required=False)
    adjustment_amount = serializers.IntegerField(required=False)
    
    class Meta:
        model = InventoryAdjustment
        fields = '__all__'
        
    def create(self, validated_data):
        inventory = validated_data.get('inventory')
        new_quantity = validated_data.get('new_quantity')
        
        # Set previous quantity if not provided
        if 'previous_quantity' not in validated_data:
            validated_data['previous_quantity'] = inventory.quantity
        
        # Calculate adjustment amount if not provided
        if 'adjustment_amount' not in validated_data:
            validated_data['adjustment_amount'] = new_quantity - validated_data['previous_quantity']
        
        # Update inventory quantity
        inventory.quantity = new_quantity
        inventory.save()
        
        return super().create(validated_data) 