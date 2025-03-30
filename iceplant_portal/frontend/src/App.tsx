import BugReportIcon from '@mui/icons-material/BugReport';
import { Box, CssBaseline, Fab, useTheme } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import { ErrorBoundary } from './components/ErrorBoundary';
import { LogProvider } from './components/LogProvider';
import { LogViewer } from './components/LogViewer';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Attendance from './pages/Attendance';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ToolsPage from './pages/ToolsPage';
import SalesPage from './pages/SalesPage';

// Remove placeholder components
// const Sales = () => <div>Sales Page (Coming Soon)</div>;
const Inventory = () => <div>Inventory Page (Coming Soon)</div>;
const Expenses = () => <div>Expenses Page (Coming Soon)</div>;

function App() {
  const [showLogs, setShowLogs] = useState(false);
  const theme = useTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
                    <Route path="/sales" element={<SalesPage />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/tools" element={<ToolsPage />} />
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
                  <Fab
                    color="primary"
                    onClick={() => setShowLogs(!showLogs)}
                    sx={{ mb: showLogs ? 2 : 0 }}
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
              </AuthProvider>
            </Router>
          </SnackbarProvider>
        </ErrorBoundary>
      </LogProvider>
    </ThemeProvider>
  );
}

export default App;
