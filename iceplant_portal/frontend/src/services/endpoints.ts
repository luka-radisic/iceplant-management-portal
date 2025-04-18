export const endpoints = {
  buyers: '/api/buyers/',
  companyConfig: '/api/company/config/',
  publicCompanyInfo: '/api/company/public-info/',
  // Maintenance Endpoints
  maintenanceItems: '/api/maintenance/items/',
  maintenanceRecords: '/api/maintenance/records/',
  maintenanceDashboard: '/api/maintenance/dashboard/',
  clearMaintenanceHistory: (itemId: number) => `/api/maintenance/records/clear-history/${itemId}/`,
  
  // Correct Sales Summary Endpoint URL
  salesSummary: '/api/sales/sales/summary/',
  
  // Add other needed endpoints if missing
  attendanceSummary: '/api/attendance/summary/', // Assuming this is the path
  inventory: '/api/inventory/items/', // Assuming this is the path
  lowStock: '/api/inventory/low-stock/', // Assuming this is the path
  expensesTotal: '/api/expenses/total/' // Assuming this is the path
}; 