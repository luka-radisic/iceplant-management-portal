import BugReportIcon from '@mui/icons-material/BugReport';
import { Box, CssBaseline, Fab, Tooltip, useTheme } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { useState, Suspense, lazy } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import ErrorBoundary from './components/ErrorBoundary';
import { ErrorHandlerProvider } from './components/GlobalErrorHandler';
import { LogProvider } from './components/LogProvider';
import { LogViewer } from './components/LogViewer';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Attendance from './pages/Attendance';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

// Lazy load components for better performance
const Sales = lazy(() => import('./pages/Sales'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Expenses = lazy(() => import('./pages/Expenses'));
const InventoryExample = lazy(() => import('./pages/InventoryExample'));

// Loading component for suspense fallback
const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    Loading...
  </div>
);

function App() {
  const [showLogs, setShowLogs] = useState(false);
  const theme = useTheme();

  const toggleLogs = () => setShowLogs(!showLogs);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorHandlerProvider>
        <LogProvider>
          <ErrorBoundary>
            <SnackbarProvider maxSnack={3}>
              <Router>
                <AuthProvider>
                  <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route
                      element={
                        <ProtectedRoute>
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Dashboard />} />
                      <Route path="/attendance" element={<Attendance />} />
                      <Route 
                        path="/sales" 
                        element={
                          <Suspense fallback={<Loading />}>
                            <Sales />
                          </Suspense>
                        } 
                      />
                      <Route 
                        path="/inventory" 
                        element={
                          <Suspense fallback={<Loading />}>
                            <Inventory />
                          </Suspense>
                        } 
                      />
                      <Route 
                        path="/expenses" 
                        element={
                          <Suspense fallback={<Loading />}>
                            <Expenses />
                          </Suspense>
                        } 
                      />
                      <Route 
                        path="/inventory-example" 
                        element={
                          <Suspense fallback={<Loading />}>
                            <InventoryExample />
                          </Suspense>
                        } 
                      />
                    </Route>

                    {/* Catch all route */}
                    <Route path="*" element={<Navigate to="/" replace />} />
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
                    <Tooltip title={showLogs ? "Hide Debug Logs" : "Show Debug Logs"}>
                      <Fab
                        color="primary"
                        onClick={toggleLogs}
                        aria-label={showLogs ? "Hide debug logs" : "Show debug logs"}
                        sx={{ mb: showLogs ? 2 : 0 }}
                      >
                        <BugReportIcon />
                      </Fab>
                    </Tooltip>
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
                </AuthProvider>
              </Router>
            </SnackbarProvider>
          </ErrorBoundary>
        </LogProvider>
      </ErrorHandlerProvider>
    </ThemeProvider>
  );
}

export default App;
