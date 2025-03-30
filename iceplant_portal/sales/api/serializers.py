from rest_framework import serializers
from sales.models import Sale
from decimal import Decimal, InvalidOperation # Import Decimal and InvalidOperation

class SaleSerializer(serializers.ModelSerializer):
    # Add new properties as read-only fields
    total_quantity = serializers.IntegerField(read_only=True)
    payment_status = serializers.CharField(read_only=True)
    
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
            'total_quantity', # Read-only property
            'total_cost', # Now handled by get_total_cost
            'total_payment', # Now handled by get_total_payment
            'payment_status', # Read-only property
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('created_at', 'updated_at', 'total_quantity', 'total_cost', 'total_payment', 'payment_status')
        
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
        
    # Removed get_total_weight and get_brine_level_display methods 