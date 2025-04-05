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
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import apiService from '../services/api';

interface EmployeeOption {
  id: string;
  name: string;
}

const AttendanceCleanupTool: React.FC = () => {
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);

  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);

  const [month, setMonth] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    setPreviewCount(null);
    try {
      const params: any = {
        employee_id: selectedEmployee?.id || undefined,
        department: department || undefined,
        dry_run: true,
      };
      if (month) params.month = month.toISOString().slice(0, 7);
      if (startDate) params.start_date = startDate.toISOString().slice(0, 10);
      if (endDate) params.end_date = endDate.toISOString().slice(0, 10);

      const res = await apiService.bulkDeleteAttendance(params);
      setPreviewCount(res.deleted_count);
    } catch (error) {
      console.error('Preview error:', error);
      setPreviewCount(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete these records? This cannot be undone.')) {
      return;
    }
    setDeleting(true);
    try {
      const params: any = {
        employee_id: selectedEmployee?.id || undefined,
        department: department || undefined,
        dry_run: false,
      };
      if (month) params.month = month.toISOString().slice(0, 7);
      if (startDate) params.start_date = startDate.toISOString().slice(0, 10);
      if (endDate) params.end_date = endDate.toISOString().slice(0, 10);

      const res = await apiService.bulkDeleteAttendance(params);
      alert(`Deleted ${res.deleted_count} records.`);
      setPreviewCount(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete records.');
    } finally {
      setDeleting(false);
    }
  };

  const handleReset = () => {
    setSelectedEmployee(null);
    setEmployeeQuery('');
    setDepartment('');
    setMonth(null);
    setStartDate(null);
    setEndDate(null);
    setPreviewCount(null);
  };

  return (
    <Box p={2} border={1} borderRadius={2} borderColor="grey.300" mt={2}>
      <Typography variant="h6" gutterBottom>
        Attendance Database Cleanup
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
                <TextField {...params} label="Employee" size="small" fullWidth />
              )}
              filterOptions={(x) => x} // disable client filtering
              loadingText="Searching..."
              noOptionsText="Type to search"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="Department"
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
              views={['year', 'month']}
              label="Month"
              value={month}
              onChange={(newValue) => setMonth(newValue)}
              slotProps={{
                textField: { fullWidth: true, size: 'small', InputLabelProps: { shrink: true } },
              }}
            />
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

      <Box mt={3} display="flex" gap={2} alignItems="center">
        <Button variant="contained" onClick={handlePreview} disabled={loading || deleting}>
          Preview Records to Delete
        </Button>
        {loading && <CircularProgress size={24} />}
        {previewCount !== null && (
          <Typography>
            {previewCount} record{previewCount === 1 ? '' : 's'} will be deleted.
          </Typography>
        )}
      </Box>

      <Box mt={2} display="flex" gap={2}>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={deleting || previewCount === null || previewCount === 0}
        >
          {deleting ? 'Deleting...' : 'Delete Records'}
        </Button>
        <Button variant="outlined" onClick={handleReset} disabled={deleting || loading}>
          Reset Filters
        </Button>
      </Box>
    </Box>
  );
}

export default AttendanceCleanupTool;