// Define the Sale type based on the serializer fields
import { BuyerLight } from './buyers';

export interface Sale {
    id: number;
    si_number: string;
    sale_date: string; // Keep as string for simplicity, format if needed
    sale_time: string; // Keep as string
    status: 'active' | 'canceled' | 'error'; // Add status field with literal types
    buyer?: BuyerLight;  // Reference to buyer (optional for backward compatibility)
    buyer_name: string;
    buyer_contact?: string | null;
    po_number?: string | null;
    pickup_quantity: number;
    delivery_quantity: number;
    brine1_identifier?: string | null;
    brine2_identifier?: string | null;
    // Expect strings for fields serialized from DecimalField
    price_per_block: string;
    cash_amount: string;
    po_amount: string;
    notes?: string | null;
    // Calculated properties might also be strings depending on serializer
    total_quantity: number; // Keep as number, likely safe
    total_cost: string | number; // Expect string or number, parse before use
    total_payment: string | number; // Expect string or number
    payment_status: string;
    // Timestamps
    created_at: string; // Dates are typically strings in JSON
    updated_at: string;
} 