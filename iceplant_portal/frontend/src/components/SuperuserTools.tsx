import React from 'react';
import { Typography, Grid, Paper, Box } from '@mui/material';
import NoShowTool from './NoShowTool';
import AttendanceCleanupTool from './AttendanceCleanupTool';

export default function SuperuserTools() {
  return (
    <>
      <Box mt={4}>
        <Typography variant="h5" gutterBottom component="div">
          Superuser Tools
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Advanced tools for system administration. These tools are available only for superuser accounts.
        </Typography>

        <Grid container spacing={3}>
          {/* No Show Tool */}
          <Grid item xs={12}>
            <NoShowTool />
          </Grid>

          {/* Attendance Cleanup Tool */}
          <Grid item xs={12}>
            <AttendanceCleanupTool />
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
