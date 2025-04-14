import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Grid,
  MenuItem,
  TextField,
  Typography,
  CircularProgress,
  Autocomplete,
  Alert,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import apiService from '../services/api';
import { format, subDays } from 'date-fns';

interface EmployeeOption {
  id: string;
  name: string;
}

interface AddedRecord {
  employee_id: string;
  employee_name: string;
  date: string;
}

const AddMissingDaysTool: React.FC = () => {
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);

  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);

  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 30)); // Default to 30 days ago
  const [endDate, setEndDate] = useState<Date | null>(new Date()); // Default to today
  
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [addedRecords, setAddedRecords] = useState<AddedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await apiService.getDepartments();
        setDepartments(res.departments || []);
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!employeeQuery) {
        setEmployeeOptions([]);
        return;
      }
      try {
        const res = await apiService.searchEmployees(employeeQuery);
        if (Array.isArray(res.results)) {
          setEmployeeOptions(
            res.results.map((emp: any) => ({
              id: emp.employee_id,
              name: emp.full_name || emp.employee_id,
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchEmployees();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [employeeQuery]);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setPreviewCount(null);
    setAddedRecords([]);
    
    try {
      const params: any = {
        dry_run: true,
      };
      
      if (selectedEmployee?.id) params.employee_id = selectedEmployee.id;
      if (department) params.department = department;
      if (startDate) params.start_date = format(startDate, 'yyyy-MM-dd');
      if (endDate) params.end_date = format(endDate, 'yyyy-MM-dd');

      const res = await apiService.addMissingDays(params);
      setPreviewCount(res.added_count);
      
      // If there are records to preview, show a sample
      if (res.added_records && res.added_records.length > 0) {
        // Show up to 10 records as a preview
        setAddedRecords(res.added_records.slice(0, 10));
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      setError(error.response?.data?.error || 'Failed to preview missing days');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMissingDays = async () => {
    if (!window.confirm('Are you sure you want to add missing days? This will create "No Show" records for employees with no punch records in the selected date range.')) {
      return;
    }
    
    setProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const params: any = {
        dry_run: false,
      };
      
      if (selectedEmployee?.id) params.employee_id = selectedEmployee.id;
      if (department) params.department = department;
      if (startDate) params.start_date = format(startDate, 'yyyy-MM-dd');
      if (endDate) params.end_date = format(endDate, 'yyyy-MM-dd');

      const res = await apiService.addMissingDays(params);
      setSuccess(`Successfully added ${res.added_count} missing day records.`);
      setAddedRecords(res.added_records.slice(0, 10)); // Show a sample of added records
    } catch (error: any) {
      console.error('Add missing days error:', error);
      setError(error.response?.data?.error || 'Failed to add missing days');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedEmployee(null);
    setEmployeeQuery('');
    setDepartment('');
    setStartDate(subDays(new Date(), 30));
    setEndDate(new Date());
    setPreviewCount(null);
    setAddedRecords([]);
    setError(null);
    setSuccess(null);
  };

  return (
    <Box p={2} border={1} borderRadius={2} borderColor="grey.300" mt={2}>
      <Typography variant="h6" gutterBottom>
        Add Missing Days Tool
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        This tool identifies employees with missing attendance records (no punch records) and adds them as "No Show" entries.
      </Typography>
      
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12} sm={6} md={4}>
            <Autocomplete
              options={employeeOptions}
              getOptionLabel={(option) => `${option.name} (${option.id})`}
              value={selectedEmployee}
              onChange={(_, newValue) => setSelectedEmployee(newValue)}
              inputValue={employeeQuery}
              onInputChange={(_, newInput) => setEmployeeQuery(newInput)}
              renderInput={(params) => (
                <TextField {...params} label="Employee (Optional)" size="small" fullWidth />
              )}
              filterOptions={(x) => x} // disable client filtering
              loadingText="Searching..."
              noOptionsText="Type to search"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="Department (Optional)"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="">All Departments</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              slotProps={{
                textField: { fullWidth: true, size: 'small', InputLabelProps: { shrink: true } },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              slotProps={{
                textField: { fullWidth: true, size: 'small', InputLabelProps: { shrink: true } },
              }}
            />
          </Grid>
        </Grid>
      </LocalizationProvider>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}

      <Box mt={3} display="flex" gap={2} alignItems="center">
        <Button 
          variant="contained" 
          onClick={handlePreview} 
          disabled={loading || processing}
        >
          Preview Missing Days
        </Button>
        {loading && <CircularProgress size={24} />}
        {previewCount !== null && (
          <Typography>
            {previewCount} record{previewCount === 1 ? '' : 's'} will be added.
          </Typography>
        )}
      </Box>

      {addedRecords.length > 0 && (
        <Box mt={2} mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            Sample of records {previewCount !== null ? 'to be added' : 'added'}:
          </Typography>
          <Box 
            sx={{ 
              maxHeight: '200px', 
              overflowY: 'auto', 
              border: '1px solid #e0e0e0', 
              borderRadius: 1, 
              p: 1 
            }}
          >
            {addedRecords.map((record, index) => (
              <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                {record.employee_name} (ID: {record.employee_id}) - {record.date}
              </Typography>
            ))}
            {addedRecords.length < (previewCount || 0) && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                ... and {(previewCount || 0) - addedRecords.length} more
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Box mt={2} display="flex" gap={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddMissingDays}
          disabled={processing || previewCount === null || previewCount === 0}
        >
          {processing ? 'Processing...' : 'Add Missing Days'}
        </Button>
        <Button variant="outlined" onClick={handleReset} disabled={processing || loading}>
          Reset Filters
        </Button>
      </Box>
    </Box>
  );
}

export default AddMissingDaysTool;