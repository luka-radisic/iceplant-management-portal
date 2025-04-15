import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  CircularProgress, 
  Typography, 
  TextField,
  Grid,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import apiService from '../services/api';
import { useSnackbar } from 'notistack';

const NoShowTool: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  
  // Use state to track superuser status
  const [isSuperuser, setIsSuperuser] = useState(false);
  
  // Check if the current user is a superuser using useEffect
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setIsSuperuser(user.is_superuser === true);
    } catch (err) {
      console.error('Error checking superuser status:', err);
      setIsSuperuser(false);
    }
  }, []);

  const generateNoShowRecords = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }

    if (endDate < startDate) {
      setError('End date must be after start date.');
      return;
    }

    setError(null);
    setProcessing(true);
    setResult(null);

    try {
      // Format dates as YYYY-MM-DD for the API
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');

      // Call the API directly to match the backend endpoint
      const response = await apiService.post('/api/tools/tools/generate-no-show/', {
        start_date: formattedStartDate,
        end_date: formattedEndDate
      });

      setResult(response);
      enqueueSnackbar('Successfully generated No Show records!', { variant: 'success' });
    } catch (error: any) {
      console.error('Error generating No Show records:', error);
      setError(error.response?.data?.error || 'Failed to generate No Show records. Check console for details.');
      enqueueSnackbar('Failed to generate No Show records.', { variant: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  // Don't render anything for non-superusers
  if (!isSuperuser) {
    console.log('User is not a superuser, not rendering NoShowTool');
    return null;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        No Show Records Generator
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Generate "No Show" records for all employees who have no punch records for each day in the selected date range.
        This tool will create attendance records with no_show=True for days with no punches.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
        </Grid>
      </LocalizationProvider>

      <Button
        variant="contained"
        color="primary"
        onClick={generateNoShowRecords}
        disabled={processing || !startDate || !endDate}
        fullWidth
        sx={{ mb: 2 }}
      >
        {processing ? <CircularProgress size={24} /> : 'Generate No Show Records'}
      </Button>

      {result && (
        <Box mt={3}>
          <Alert severity="success">
            <Typography variant="subtitle1">
              Successfully created {result.created_count} No Show records.
            </Typography>
          </Alert>
          
          {result.created_count > 0 && (
            <Box mt={2} sx={{ maxHeight: '200px', overflow: 'auto' }}>
              <Typography variant="subtitle2" gutterBottom>
                Records created:
              </Typography>
              {result.created_records.map((record: any, index: number) => (
                <Typography key={index} variant="body2">
                  {record.employee_name} ({record.employee_id}) - {record.date}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default NoShowTool;