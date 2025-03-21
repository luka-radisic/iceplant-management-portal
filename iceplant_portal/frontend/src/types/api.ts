// Authentication
export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

// Attendance
export interface AttendanceRecord {
  id: number;
  employee_id: string;
  check_in: string;
  check_out: string | null;
  department: string;
  import_date: string;
  duration?: string;
}

export interface ImportLog {
  id: number;
  filename: string;
  import_date: string;
  success: boolean;
  error_message: string | null;
  records_imported: number;
}

// Sales
export interface Sale {
  id: number;
  quantity: number;
  brine_level: number;
  sale_date: string;
  buyer_name: string;
  buyer_contact: string | null;
  po_number: string | null;
  payment_method: 'cash' | 'bank_transfer';
  delivery_method: 'pickup' | 'delivery';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesSummary {
  today_total: number;
  monthly_data: {
    month: string;
    amount: number;
  }[];
}

// Inventory
export interface InventoryItem {
  id: number;
  item_name: string;
  quantity: number;
  unit: string;
  minimum_level: number;
  last_updated: string;
  is_low: boolean;
}

export interface InventoryAdjustment {
  id: number;
  inventory: number;
  previous_quantity: number;
  new_quantity: number;
  adjustment_amount: number;
  adjustment_date: string;
  reason: string;
  adjusted_by: string;
}

// Expenses
export interface Expense {
  id: number;
  description: string;
  amount: number;
  purchase_date: string;
  vendor: string;
  category: string;
  receipt: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpensesSummary {
  monthly_total: number;
  by_category: {
    category: string;
    total: number;
    count: number;
  }[];
} 