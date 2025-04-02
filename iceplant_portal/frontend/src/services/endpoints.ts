export const endpoints = {
  buyers: '/api/buyers/',
  companyConfig: '/api/company/config/',
  publicCompanyInfo: '/api/company/public-info/',
  // Maintenance Endpoints
  maintenanceItems: '/api/maintenance/items/',
  maintenanceRecords: '/api/maintenance/records/',
  maintenanceDashboard: '/api/maintenance/dashboard/',
  clearMaintenanceHistory: (itemId: number) => `/api/maintenance/records/clear-history/${itemId}/`,
}; 