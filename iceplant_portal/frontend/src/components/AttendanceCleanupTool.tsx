import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import apiService from '../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AttendanceCleanupTool({ open, onClose }: Props) {
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [month, setMonth] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    setPreviewCount(null);
    try {
      const params: any = {
        employee_id: employeeId || undefined,
        department: department || undefined,
        dry_run: true,
      };
      if (month) {
        params.month = month.toISOString().slice(0, 7);
      }
      if (startDate) {
        params.start_date = startDate.toISOString().slice(0, 10);
      }
      if (endDate) {
        params.end_date = endDate.toISOString().slice(0, 10);
      }
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
        employee_id: employeeId || undefined,
        department: department || undefined,
        dry_run: false,
      };
      if (month) {
        params.month = month.toISOString().slice(0, 7);
      }
      if (startDate) {
        params.start_date = startDate.toISOString().slice(0, 10);
      }
      if (endDate) {
        params.end_date = endDate.toISOString().slice(0, 10);
      }
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
    setEmployeeId('');
    setDepartment('');
    setMonth(null);
    setStartDate(null);
    setEndDate(null);
    setPreviewCount(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Attendance Punchcard Cleanup Tool</DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
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
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{
                  textField: { fullWidth: true, size: 'small', InputLabelProps: { shrink: true } },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting || loading}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
} 