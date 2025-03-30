// Define the Sale type based on the serializer fields

export interface Sale {
    id: number;
    si_number: string;
    sale_date: string; // Keep as string for simplicity, format if needed
    sale_time: string; // Keep as string
    status: 'active' | 'canceled' | 'error'; // Add status field with literal types
    buyer_name: string;
    buyer_contact?: string | null;
    po_number?: string | null;
    pickup_quantity: number;
    delivery_quantity: number;
    brine1_identifier?: string | null;
    brine2_identifier?: string | null;
    price_per_block: number; // Should be number from API
    cash_amount: number; // Should be number
    po_amount: number; // Should be number
    notes?: string | null;
    // Read-only calculated properties from serializer
    total_quantity: number;
    total_cost: number; 
    total_payment: number;
    payment_status: string; 
    // Timestamps
    created_at: string; // Dates are typically strings in JSON
    updated_at: string;
} 