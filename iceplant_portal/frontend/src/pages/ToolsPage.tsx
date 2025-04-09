import { Box, Container, Typography, Paper, Grid } from '@mui/material';
import AttendanceTools from '../components/AttendanceTools';
import CleanupTools from '../components/CleanupTools';
import DatabaseBackupTools from '../components/DatabaseBackupTools'; // Import DatabaseBackupTools
import AttendanceCleanupTool from '../components/AttendanceCleanupTool';
import DatabaseManagementTools from '../components/DatabaseManagementTools';

export default function ToolsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom component="div">
        Application Tools
      </Typography>
      <Grid container spacing={3}>
        {/* Attendance Processing Section */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper elevation={4} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom component="div">
              Attendance Processing
            </Typography>
            <AttendanceTools />
          </Paper>
        </Grid>

        {/* Data Cleanup Section */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper elevation={4} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom component="div">
              Data Cleanup
            </Typography>
            <CleanupTools />
          </Paper>
        </Grid>

        {/* Database Backup Section - Make this full width */}
        <Grid item xs={12} md={12} lg={12}>
          <Paper elevation={4} sx={{ p: 2, display: 'flex', flexDirection: 'column', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom component="div">
              Database Backup
            </Typography>
            <DatabaseBackupTools />
          </Paper>
        </Grid>

        {user.is_superuser && (
          <Box mt={4}>
            <AttendanceCleanupTool />
          </Box>
        )}

        {/* 
        // Placeholder for future tool sections
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h6" gutterBottom component="div">
              Another Tool Section
            </Typography>
            // <AnotherToolComponent />
          </Paper>
        </Grid>
        */}
      </Grid>

      <Box mt={4}>
        <DatabaseManagementTools />
      </Box>
    </Container>
  );
} 