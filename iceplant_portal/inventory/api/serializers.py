from rest_framework import serializers
from inventory.models import Inventory, InventoryAdjustment

class InventorySerializer(serializers.ModelSerializer):
    is_low = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Inventory
        fields = '__all__'

class InventoryAdjustmentSerializer(serializers.ModelSerializer):
    inventory_name = serializers.CharField(source='inventory.item_name', read_only=True)
    
    class Meta:
        model = InventoryAdjustment
        fields = '__all__'
        
    def create(self, validated_data):
        inventory = validated_data.get('inventory')
        new_quantity = validated_data.get('new_quantity')
        
        # Set previous quantity
        validated_data['previous_quantity'] = inventory.quantity
        
        # Calculate adjustment amount
        validated_data['adjustment_amount'] = new_quantity - inventory.quantity
        
        # Update inventory quantity
        inventory.quantity = new_quantity
        inventory.save()
        
        return super().create(validated_data) 