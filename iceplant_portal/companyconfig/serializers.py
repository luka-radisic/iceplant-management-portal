from rest_framework import serializers
from .models import CompanySettings

class CompanySettingsSerializer(serializers.ModelSerializer):
    # Add a read-only field for the logo URL
    logo_url = serializers.SerializerMethodField()
    company_logo = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = CompanySettings
        fields = [
            'id',
            'company_name',
            'company_address_line1',
            'company_address_line2',
            'company_city',
            'company_state',
            'company_postal_code',
            'company_country',
            'phone_number',
            'alternate_phone',
            'email',
            'website',
            'tax_id',
            'business_registration',
            'ice_block_weight',
            'production_capacity',
            'company_logo',
            'logo_url',
            'invoice_footer_text',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'logo_url']
    
    def get_logo_url(self, obj):
        """
        Return the URL of the company logo if it exists
        """
        if obj.company_logo and hasattr(obj.company_logo, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.company_logo.url)
            return obj.company_logo.url
        return None
        
    def to_internal_value(self, data):
        # Make a mutable copy of the data if it's immutable
        if hasattr(data, '_mutable'):
            mutable = data._mutable
            data._mutable = True
            data_copy = data.copy()
            data._mutable = mutable
        else:
            data_copy = data.copy()
            
        # Remove logo_url from incoming data as it's a read-only field
        if 'logo_url' in data_copy:
            data_copy.pop('logo_url')
            
        # Remove company_logo if it's a string (URL) instead of a file
        if 'company_logo' in data_copy and isinstance(data_copy['company_logo'], str):
            data_copy.pop('company_logo')
            
        return super().to_internal_value(data_copy) 