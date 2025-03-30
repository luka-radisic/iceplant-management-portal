import React, { useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import apiService from '../services/api';
import { useSnackbar } from 'notistack';

export default function AttendanceTools() {
  const [processingCheckIns, setProcessingCheckIns] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const processSameDayCheckIns = async () => {
    setProcessingCheckIns(true);
    try {
      // Call the backend process endpoint
      // Note: We no longer need the explicit GET call with process_checkins=true 
      // as the backend is optimized now. We just call the dedicated endpoint.
      await apiService.processSameDayCheckIns();
      
      enqueueSnackbar('Successfully processed same-day check-ins!', { variant: 'success' });
    } catch (error) {
      console.error('Error processing same-day check-ins:', error);
      enqueueSnackbar('Failed to process same-day check-ins. Check console.', { variant: 'error' });
    } finally {
      setProcessingCheckIns(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Manually process attendance records to link same-day check-ins and check-outs.
        This is useful after large imports or if automatic processing seems incorrect.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={processSameDayCheckIns}
        disabled={processingCheckIns}
        fullWidth
      >
        {processingCheckIns ? <CircularProgress size={24} /> : 'Process Same-Day Check-Ins'}
      </Button>
    </Box>
  );
} 