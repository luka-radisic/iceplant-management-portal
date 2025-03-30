/**
 * Buyer model representing a business entity or individual that purchases ice blocks
 */
export interface Buyer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  company_name?: string;
  tax_id?: string;
  business_type?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Lightweight version of the Buyer interface with essential fields
 */
export interface BuyerLight {
  id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  is_active: boolean;
} 