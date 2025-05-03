// Authentication
export interface User {
  id: number;
  username: string;
  email: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  group?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
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
  date: string;
  payee: string;
  description: string;
  amount: number;
  category: string;
  category_display: string;
  reference_number: string | null;
  payment_method: string;
  payment_method_display: string;
  ice_plant_allocation: number;
  notes: string | null;
  receipt: string | null;
  created_at: string;
  updated_at: string;
  approved: boolean;
  approved_by: number | null;
  approved_date: string | null;
  created_by: number | null;
  category_object: number | null;
  // Formatted fields
  date_formatted: string;
  created_at_formatted: string;
  updated_at_formatted: string;
  approved_date_formatted: string | null;
  // Nested objects
  created_by_details?: User;
  approved_by_details?: User;
  category_object_details?: ExpenseCategory;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
}

export interface ExpensesSummary {
  monthly_total: number;
  monthly_ice_plant_total: number;
  yearly_total: number;
  yearly_ice_plant_total: number;
  thirty_day_total: number;
  thirty_day_ice_plant_total: number;
  top_categories: {
    category: string;
    total: number;
  }[];
}

export interface ExpenseSummaryByGroup {
  period?: string;
  category?: string;
  total: number;
  ice_plant_total: number;
  count: number;
}

export interface ExpenseSummaryByPayee {
  payee: string;
  total: number;
  ice_plant_total: number;
  count: number;
}

// Maintenance
export interface MaintenanceItem {
  id: number;
  equipment_name: string;
  equipment_type: string;
  model_number?: string;
  serial_number?: string;
  location: string;
  installation_date?: string;
  last_maintenance_date?: string;
  next_maintenance_date: string;
  maintenance_frequency: number;
  frequency_unit: 'days' | 'weeks' | 'months' | 'hours';
  status: 'operational' | 'requires_maintenance' | 'under_maintenance' | 'not_operational';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: number;
  maintenance_item: MaintenanceItem; // Changed to MaintenanceItem object
  maintenance_date: string;
  maintenance_type: 'scheduled' | 'emergency' | 'preventive' | 'corrective';
  performed_by: string;
  cost: number;
  parts_replaced?: string;
  duration: number; // in hours
  issues_found?: string;
  actions_taken: string;
  recommendations?: string;
  next_maintenance_date?: string;
  status: 'completed' | 'in_progress' | 'scheduled';
  created_at: string;
  updated_at: string;
}

export interface MaintenanceTemplate {
  id: number;
  template_name: string;
  equipment_type: string;
  tasks: MaintenanceTask[];
  maintenance_frequency: number;
  frequency_unit: 'days' | 'weeks' | 'months' | 'hours';
  estimated_duration: number; // in hours
  required_tools?: string;
  required_parts?: string;
  required_skills?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceTask {
  id: number;
  task_name: string;
  description?: string;
  sequence_number: number;
  estimated_time: number; // in minutes
  template_id?: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
} 