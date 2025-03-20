from rest_framework import serializers
from sales.models import Sale

class SaleSerializer(serializers.ModelSerializer):
    total_weight = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    delivery_method_display = serializers.CharField(source='get_delivery_method_display', read_only=True)
    brine_level_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Sale
        fields = '__all__'
        
    def get_total_weight(self, obj):
        return obj.total_weight
        
    def get_brine_level_display(self, obj):
        return f"Level {obj.brine_level}" 