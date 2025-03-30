from rest_framework import serializers
from .models import CompanySettings

class CompanySettingsSerializer(serializers.ModelSerializer):
    # Add a read-only field for the logo URL
    logo_url = serializers.SerializerMethodField()
    
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
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_logo_url(self, obj):
        """
        Return the URL of the company logo if it exists
        """
        if obj.company_logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.company_logo.url)
            return obj.company_logo.url
        return None 