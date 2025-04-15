import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  CircularProgress, 
  Typography, 
  TextField, 
  FormControl, 
  FormHelperText,
  InputLabel, 
  Select, 
  MenuItem, 
  Grid, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import apiService from '../services/api';
import { useSnackbar } from 'notistack';
import Autocomplete from '@mui/material/Autocomplete';

export default function AddMissingDaysTool() {
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewResults, setPreviewResults] = useState<any>(null);
  const [dryRun, setDryRun] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  // Fetch departments on component mount
  useEffect(() => {
    // Fetch only actual departments from the database, no defaults
    fetchDepartments(false);
  }, []);

  // Separate fetchDepartments function to allow manual refresh
  const fetchDepartments = async (includeDefaults = false) => {
    try {
      console.log('Fetching departments...', includeDefaults ? 'including defaults' : 'only from database');
      const response = await apiService.getDepartments({ include_defaults: includeDefaults });
      console.log('Departments response:', response);
      
      // Ensure response has the 'departments' key and it's an array
      if (response && Array.isArray(response.departments)) {
        setDepartments(response.departments);
      } else {
        console.log('No departments found or invalid response format');
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  };

  // Search for employees when search term changes
  useEffect(() => {
    const searchEmployees = async () => {
      if (searchTerm.length < 2) return;
      
      try {
        console.log('Searching for employees with term:', searchTerm);
        const response = await apiService.get(
          `/api/attendance/employee-profile/?search=${encodeURIComponent(searchTerm)}`
        );
        
        // Log the exact response structure
        console.log('Employee search raw response:', response);
        
        // Handle different possible response structures
        if (response) {
          if (Array.isArray(response)) {
            console.log('Response is an array, using directly');
            setEmployees(response);
          } else if (response.results && Array.isArray(response.results)) {
            console.log('Response has results array');
            setEmployees(response.results);
          } else if (response.count >= 0 && response.results) {
            // Django REST Framework pagination format
            console.log('Response has DRF pagination format');
            setEmployees(response.results);
          } else {
            // Try to extract employees from any property that is an array
            console.log('Trying to find array in response');
            const arrayProps = Object.entries(response)
              .filter(([key, val]) => Array.isArray(val))
              .map(([key, val]) => ({ key, val }));
            
            console.log('Found array properties:', arrayProps.map(p => p.key));
            
            if (arrayProps.length > 0) {
              // Use the first array property
              setEmployees(arrayProps[0].val);
            } else {
              console.log('No array found in response, search results might be empty');
              setEmployees([]);
            }
          }
        } else {
          console.log('No response data, clearing employees');
          setEmployees([]);
        }
      } catch (error) {
        console.error('Error searching employees:', error);
        setEmployees([]);
      }
    };

    const timer = setTimeout(() => {
      if (searchTerm) {
        searchEmployees();
      } else {
        setEmployees([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handlePreview = async () => {
    if (!startDate || !endDate) {
      enqueueSnackbar('Please select both start and end dates', { variant: 'error' });
      return;
    }

    setPreviewLoading(true);
    try {
      const params: any = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        dry_run: true
      };

      if (selectedEmployee) {
        params.employee_id = selectedEmployee.employee_id;
      }

      if (selectedDepartment) {
        params.department = selectedDepartment;
      }

      const result = await apiService.addMissingDays(params);
      setPreviewResults(result);
      enqueueSnackbar(`Preview generated: ${result.added_count} records would be added`, { variant: 'success' });
    } catch (error) {
      console.error('Error generating preview:', error);
      enqueueSnackbar('Failed to generate preview. Check console.', { variant: 'error' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAddMissingDays = async () => {
    if (!startDate || !endDate) {
      enqueueSnackbar('Please select both start and end dates', { variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      const params: any = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        dry_run: false
      };

      if (selectedEmployee) {
        params.employee_id = selectedEmployee.employee_id;
      }

      if (selectedDepartment) {
        params.department = selectedDepartment;
      }

      const result = await apiService.addMissingDays(params);
      setPreviewResults(result);
      enqueueSnackbar(`Successfully added ${result.added_count} missing attendance records`, { variant: 'success' });
    } catch (error) {
      console.error('Error adding missing days:', error);
      enqueueSnackbar('Failed to add missing days. Check console.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add "No Show" attendance records for employees with no punch records in the selected date range.
        This is useful for tracking employees who didn't show up for work.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} md={6}>
          <Autocomplete
            options={employees}
            getOptionLabel={(option) => `${option.full_name} (${option.employee_id})`}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Employee (Optional)"
                fullWidth
                margin="normal"
                onChange={(e) => setSearchTerm(e.target.value)}
                helperText={searchTerm.length >= 2 && employees.length === 0 ? "No matching employees found" : ""}
              />
            )}
            onChange={(_, newValue) => setSelectedEmployee(newValue)}
            value={selectedEmployee}
            noOptionsText="No employees found - try a different search term"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth margin="normal">
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <InputLabel id="department-select-label">Department (Optional)</InputLabel>
              <Button 
                size="small" 
                sx={{ ml: 'auto', mb: -3, zIndex: 1 }}
                onClick={() => {
                  setSelectedDepartment('');
                  fetchDepartments();
                }}
              >
                <RefreshIcon fontSize="small" />
              </Button>
            </Box>
            <Select
              labelId="department-select-label"
              value={selectedDepartment}
              label="Department (Optional)"
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <MenuItem value="">
                <em>All Departments</em>
              </MenuItem>
              {departments.length === 0 && (
                <MenuItem disabled>
                  <em>No departments found</em>
                </MenuItem>
              )}
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </Select>
            {departments.length === 0 && (
              <FormHelperText>No departments found. Click refresh to update.</FormHelperText>
            )}
          </FormControl>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={handlePreview}
          disabled={previewLoading || loading}
          sx={{ mr: 1 }}
        >
          {previewLoading ? <CircularProgress size={24} /> : 'Preview Missing Days'}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddMissingDays}
          disabled={loading || previewLoading}
        >
          {loading ? <CircularProgress size={24} /> : 'Add Missing Days'}
        </Button>
      </Box>

      {previewResults && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Preview Results
          </Typography>
          <Typography variant="body2" gutterBottom>
            {previewResults.added_count} records would be added for the date range {previewResults.checked_dates[0]} to {previewResults.checked_dates[previewResults.checked_dates.length - 1]}
          </Typography>
          
          {previewResults.added_count > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                Employees with missing days:
              </Typography>
              <List dense>
                {previewResults.added_records.slice(0, 10).map((record: any, index: number) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText 
                        primary={`${record.employee_name} (${record.employee_id})`} 
                        secondary={`Date: ${record.date}`} 
                      />
                    </ListItem>
                    {index < Math.min(9, previewResults.added_records.length - 1) && <Divider />}
                  </React.Fragment>
                ))}
                {previewResults.added_records.length > 10 && (
                  <ListItem>
                    <ListItemText 
                      primary={`... and ${previewResults.added_records.length - 10} more`} 
                    />
                  </ListItem>
                )}
              </List>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}