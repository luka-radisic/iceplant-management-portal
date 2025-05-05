export const endpoints = {
  login: '/api-token-auth/',
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
  expensesTotal: '/api/expenses/total/', // Assuming this is the path
  
  // User & Permission Management Endpoints
  userPermissions: '/api/users/me/permissions/',
  modulePermissions: '/api/users/module-permissions/',
  updateGroupModules: '/api/users/update-group-modules/', // New endpoint for updating group module permissions
  users: '/api/users/users/',
  groups: '/api/users/groups/',
  userManagement: '/api/users/user-management/',
  assignGroups: '/api/users/user-management/assign_groups/',
  addUsersToGroup: (groupId: number) => `/api/users/groups/${groupId}/add_users/`,
  removeUsersFromGroup: (groupId: number) => `/api/users/groups/${groupId}/remove_users/`
};