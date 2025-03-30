from rest_framework import serializers
from buyers.models import Buyer

class BuyerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Buyer
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

class BuyerLightSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for Buyer model with only essential fields
    """
    class Meta:
        model = Buyer
        fields = ('id', 'name', 'company_name', 'email', 'phone', 'is_active')
        read_only_fields = ('id', 'created_at', 'updated_at') 