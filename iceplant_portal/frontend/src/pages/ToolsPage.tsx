import React from 'react';
import { Box, Container, Typography, Paper, Grid } from '@mui/material';
import AttendanceTools from '../components/AttendanceTools';
import CleanupTools from '../components/CleanupTools';
import DatabaseBackupTools from '../components/DatabaseBackupTools'; // Import DatabaseBackupTools

export default function ToolsPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom component="div">
        Application Tools
      </Typography>
      <Grid container spacing={3}>
        {/* Attendance Processing Section */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h6" gutterBottom component="div">
              Attendance Processing
            </Typography>
            <AttendanceTools />
          </Paper>
        </Grid>

        {/* Data Cleanup Section */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h6" gutterBottom component="div">
              Data Cleanup
            </Typography>
            <CleanupTools />
          </Paper>
        </Grid>

        {/* Database Backup Section */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h6" gutterBottom component="div">
              Database Backup
            </Typography>
            <DatabaseBackupTools />
          </Paper>
        </Grid>

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
    </Container>
  );
} 