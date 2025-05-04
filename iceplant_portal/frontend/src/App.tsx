import BugReportIcon from '@mui/icons-material/BugReport';
import { Box, CssBaseline, Fab, useTheme } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { useState, useEffect } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import { ErrorBoundary } from './components/ErrorBoundary';
import { LogProvider } from './components/LogProvider';
import { LogViewer } from './components/LogViewer';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import SuperAdminRoute from './components/SuperAdminRoute';
import GroupRoute from './components/GroupRoute';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Attendance from './pages/Attendance';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ToolsPage from './pages/ToolsPage';
import SalesPage from './pages/SalesPage';
import BuyersPage from './pages/BuyersPage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import SalePrintView from './components/sales/SalePrintView';
import InventoryPage from './pages/InventoryPage';
import ExpensesPage from './pages/ExpensesPage';
import MaintenancePage from './pages/MaintenancePage';
import MaintenancePrintPage from './pages/MaintenancePrintPage';
import GroupManagementPage from './pages/admin/GroupManagementPage';
import UserProfilePage from './pages/UserProfilePage';

// Remove placeholder components
// const Sales = () => <div>Sales Page (Coming Soon)</div>;
// const Inventory = () => <div>Inventory Page (Coming Soon)</div>;
// const Expenses = () => <div>Expenses Page (Coming Soon)</div>;

function AppContent() {
  const [showLogs, setShowLogs] = useState(false);
  const theme = useTheme();

  // Fetch company info and update title
  useEffect(() => {
    async function fetchCompanyName() {
      try {
        const response = await fetch('/api/company-info/');
        if (!response.ok) throw new Error('Failed to fetch company info');
        const data = await response.json();
        if (data.name) {
          document.title = data.name;
        } else {
          document.title = 'Company Management Portal';
        }
      } catch {
        document.title = 'Company Management Portal';
      }
    }
    fetchCompanyName();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LogProvider>
        <ErrorBoundary>
          <SnackbarProvider maxSnack={3}>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                
                {/* Print view route - doesn't need dashboard layout or auth */}
                <Route path="/sales/print/:id" element={<SalePrintView />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >                  <Route index element={<Dashboard />} />
                  
                  {/* Group-protected routes */}
                  <Route path="/attendance" element={
                    <GroupRoute allowedGroups={['HR', 'Managers', 'Admins']}>
                      <Attendance />
                    </GroupRoute>
                  } />
                  
                  <Route path="/sales" element={
                    <GroupRoute allowedGroups={['Sales', 'Accounting', 'Managers', 'Admins']}>
                      <SalesPage />
                    </GroupRoute>
                  } />
                  
                  <Route path="/buyers" element={
                    <GroupRoute allowedGroups={['Sales', 'Accounting', 'Managers', 'Admins']}>
                      <BuyersPage />
                    </GroupRoute>
                  } />
                  
                  <Route path="/inventory" element={
                    <GroupRoute allowedGroups={['Inventory', 'Operations', 'Managers', 'Admins']}>
                      <InventoryPage />
                    </GroupRoute>
                  } />
                  
                  <Route path="/expenses" element={
                    <GroupRoute allowedGroups={['Accounting', 'Finance', 'Managers', 'Admins']}>
                      <ExpensesPage />
                    </GroupRoute>
                  } />
                  
                  <Route path="/maintenance" element={
                    <GroupRoute allowedGroups={['Maintenance', 'Operations', 'Managers', 'Admins']}>
                      <MaintenancePage />
                    </GroupRoute>
                  } />                  {/* Superadmin-only routes */}
                  <Route path="/tools" element={<SuperAdminRoute><ToolsPage /></SuperAdminRoute>} />
                  <Route path="/company-settings" element={<SuperAdminRoute><CompanySettingsPage /></SuperAdminRoute>} />
                  <Route path="/group-management" element={<SuperAdminRoute><GroupManagementPage /></SuperAdminRoute>} />
                  
                  {/* User profile - accessible to all authenticated users */}
                  <Route path="/profile" element={<UserProfilePage />} />
                  
                  {/* Admin edit routes */}
                  <Route path="/admin/sales/sale/:id/change" element={
                    <AdminRoute>
                      <SalesPage />
                    </AdminRoute>
                  } />
                </Route>

                {/* Print route - remove ProtectedRoute */}
                <Route path="/maintenance/print/:id" element={<MaintenancePrintPage />} />
                <Route path="/maintenance/print/selected" element={<MaintenancePrintPage />} />

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>

              {/* Floating Log Viewer */}
              <Box
                sx={{
                  position: 'fixed',
                  bottom: theme.spacing(2),
                  right: theme.spacing(2),
                  zIndex: theme.zIndex.drawer + 2,
                }}
              >
                <Fab
                  color="primary"
                  onClick={() => setShowLogs(!showLogs)}
                  sx={{ mb: showLogs ? 2 : 0 }}
                  aria-label="Toggle debug logs"
                >
                  <BugReportIcon />
                </Fab>
                {showLogs && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: '100%',
                      right: 0,
                      width: '600px',
                      maxWidth: '90vw',
                      mb: 2,
                    }}
                  >
                    <LogViewer maxHeight={400} />
                  </Box>
                )}
              </Box>
            </Router>
          </SnackbarProvider>
        </ErrorBoundary>
      </LogProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
