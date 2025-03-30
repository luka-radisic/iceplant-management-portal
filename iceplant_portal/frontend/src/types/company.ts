/**
 * Company settings interface
 */
export interface CompanySettings {
    id?: number;
    company_name: string;
    company_address_line1?: string;
    company_address_line2?: string;
    company_city?: string;
    company_state?: string;
    company_postal_code?: string;
    company_country: string;
    
    phone_number?: string;
    alternate_phone?: string;
    email?: string;
    website?: string;
    
    tax_id?: string;
    business_registration?: string;
    
    ice_block_weight: number;
    production_capacity: number;
    
    company_logo?: File | null;
    logo_url?: string;
    
    invoice_footer_text?: string;
    
    created_at?: string;
    updated_at?: string;
}

/**
 * Default company settings
 */
export const defaultCompanySettings: CompanySettings = {
    company_name: 'Ice Plant',
    company_country: 'Philippines',
    ice_block_weight: 100,
    production_capacity: 1000
}; 