import React, { useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import apiService from '../services/api';
import { useSnackbar } from 'notistack';

export default function CleanupTools() {
  const [cleaningShortDuration, setCleaningShortDuration] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleCleanupShortDuration = async () => {
    setCleaningShortDuration(true);
    try {
      const response = await apiService.cleanupShortDurationAttendance(); // We will add this to apiService next
      enqueueSnackbar(response.message || 'Cleanup process completed.', { 
        variant: response.deleted_count > 0 ? 'success' : 'info' 
      });
      if (response.deleted_count > 0) {
        console.log(`Deleted ${response.deleted_count} short duration records:`, response.deleted_ids);
        // Consider adding logic here to trigger a refresh of relevant views if needed
      }
    } catch (error) {
      console.error('Error cleaning up short duration records:', error);
      enqueueSnackbar('Failed to cleanup short duration records. Check console.', { variant: 'error' });
    } finally {
      setCleaningShortDuration(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Remove attendance records where the time between check-in and check-out
        is less than 5 minutes. These usually represent accidental double punches.
      </Typography>
      <Button
        variant="contained"
        color="warning" // Use warning color for potentially destructive action
        onClick={handleCleanupShortDuration}
        disabled={cleaningShortDuration}
        fullWidth
      >
        {cleaningShortDuration ? <CircularProgress size={24} /> : 'Remove Short Duration Records (< 5 min)'}
      </Button>
    </Box>
  );
} 