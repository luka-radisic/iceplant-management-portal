from rest_framework import serializers
from sales.models import Sale
from decimal import Decimal, InvalidOperation # Import Decimal and InvalidOperation
from buyers.models import Buyer
from buyers.api.serializers import BuyerLightSerializer
from sales.models import SaleItem

class SaleItemSerializer(serializers.ModelSerializer):
    inventory_item_name = serializers.CharField(source='inventory_item.item_name', read_only=True)

    class Meta:
        model = SaleItem
        fields = ['id', 'inventory_item', 'inventory_item_name', 'quantity', 'unit_price', 'total_price']
        read_only_fields = ['total_price']


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, required=False)

    # Add new properties as read-only fields
    total_quantity = serializers.IntegerField(read_only=True)
    payment_status = serializers.CharField(read_only=True)
    
    # Include buyer details
    buyer = BuyerLightSerializer(read_only=True)
    buyer_id = serializers.UUIDField(write_only=True, required=False)
    
    # Use SerializerMethodField for potentially problematic decimals
    total_cost = serializers.SerializerMethodField()
    total_payment = serializers.SerializerMethodField()
    
    # Removed fields related to old model structure:
    # total_weight, payment_method_display, delivery_method_display, brine_level_display
    
    class Meta:
        model = Sale
        # Explicitly list fields instead of '__all__'
        fields = [
            'id',
            'si_number',
            'sale_date',
            'sale_time',
            'status',
            'buyer',       # Add related buyer object (read-only)
            'buyer_id',    # Add buyer ID field (write-only)
            'buyer_name',
            'buyer_contact',
            'po_number',
            'pickup_quantity',
            'delivery_quantity',
            'brine1_identifier',
            'brine2_identifier',
            'price_per_block',
            'cash_amount',
            'po_amount',
            'notes',
            'is_iceplant',
            'total_quantity', # Read-only property
            'total_cost', # Now handled by get_total_cost
            'total_payment', # Now handled by get_total_payment
            'payment_status', # Read-only property
            'created_at',
            'updated_at',
            'items',
        ]
        read_only_fields = ('created_at', 'updated_at', 'total_quantity', 'total_cost', 'total_payment', 'payment_status', 'buyer')
        
    def get_total_cost(self, obj: Sale) -> Decimal:
        """Safely calculate and format total_cost."""
        try:
            # Access the already robust property from the model
            cost = obj.total_cost 
            # Ensure it's a Decimal before returning (redundant but safe)
            return Decimal(cost).quantize(Decimal('0.01'))
        except (InvalidOperation, TypeError, ValueError):
            # Return a default Decimal value if any error occurs
            return Decimal('0.00')

    def get_total_payment(self, obj: Sale) -> Decimal:
        """Safely calculate and format total_payment."""
        try:
            # Access the already robust property from the model
            payment = obj.total_payment
            # Ensure it's a Decimal before returning
            return Decimal(payment).quantize(Decimal('0.01'))
        except (InvalidOperation, TypeError, ValueError):
            # Return a default Decimal value if any error occurs
            return Decimal('0.00')
        
    def create(self, validated_data):
        """
        Override create method to handle nested sale items and buyer creation/lookup.
        Enforces stock validation and deduction.
        """
        from inventory.models import Inventory
        from rest_framework.exceptions import ValidationError

        # Extract nested sale items if provided
        items_data = validated_data.pop('items', [])
        # Extract buyer_id from validated data if present
        buyer_id = validated_data.pop('buyer_id', None)
        buyer_name = validated_data.get('buyer_name', '')
        
        buyer = None
        
        # Case 1: buyer_id is provided - use it directly
        if buyer_id:
            try:
                buyer = Buyer.objects.get(id=buyer_id)
            except Buyer.DoesNotExist:
                pass
                
        # Case 2: No buyer_id, but have buyer_name - look up or create
        elif buyer_name:
            buyer = Buyer.objects.filter(name__iexact=buyer_name).first()
            if not buyer:
                buyer = Buyer.objects.create(name=buyer_name)
        
        # Create the sale object with the remaining data
        sale = Sale.objects.create(**validated_data)
        
        # Associate the buyer if one was found or created
        if buyer:
            sale.buyer = buyer
            sale.save()
        
        # Create nested sale items with stock validation
        for item_data in items_data:
            inventory_id = item_data.get('inventory_item')
            quantity = item_data.get('quantity', 0)

            try:
                inventory_item = Inventory.objects.get(id=inventory_id)
            except Inventory.DoesNotExist:
                raise ValidationError(f"Inventory item with ID {inventory_id} does not exist.")

            if inventory_item.quantity < quantity:
                raise ValidationError(f"Not enough stock for item '{inventory_item.item_name}'. Available: {inventory_item.quantity}, requested: {quantity}.")

            # Deduct stock
            inventory_item.quantity -= quantity
            inventory_item.save()

            SaleItem.objects.create(sale=sale, **item_data)
        
        return sale
        
    def update(self, instance, validated_data):
        """
        Override update method to handle nested sale items and buyer updates.
        """
        # Extract nested sale items if provided
        items_data = validated_data.pop('items', None)
        # Extract buyer_id from validated data if present
        buyer_id = validated_data.pop('buyer_id', None)
        
        # Update the buyer reference if buyer_id is provided
        if buyer_id:
            try:
                buyer = Buyer.objects.get(id=buyer_id)
                instance.buyer = buyer
            except Buyer.DoesNotExist:
                pass
        
        # Update all other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if items_data is not None:
            # Sync sale items
            existing_items = {item.id: item for item in instance.items.all()}
            sent_item_ids = []
            for item in items_data:
                item_id = item.get('id', None)
                if item_id and item_id in existing_items:
                    # Update existing item
                    sale_item = existing_items[item_id]
                    for attr, value in item.items():
                        if attr != 'id':
                            setattr(sale_item, attr, value)
                    sale_item.save()
                    sent_item_ids.append(item_id)
                else:
                    # Create new item
                    new_item = SaleItem.objects.create(sale=instance, **item)
                    sent_item_ids.append(new_item.id)
            # Delete items not in sent data
            for item_id, sale_item in existing_items.items():
                if item_id not in sent_item_ids:
                    sale_item.delete()
        
        return instance
        
    # Removed get_total_weight and get_brine_level_display methods 

    def to_representation(self, instance):
        """
        Override to_representation to ensure buyer_name is always in sync with the buyer.
        """
        representation = super().to_representation(instance)
        
        # If there's a buyer object, always use its name for buyer_name field
        if instance.buyer:
            representation['buyer_name'] = instance.buyer.name
            
        return representation 