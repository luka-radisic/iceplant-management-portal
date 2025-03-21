import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
} from '@mui/material';
import { format } from 'date-fns';
import apiService from '../services/api';

interface EmployeeAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

export default function EmployeeAttendanceModal({ open, onClose, employeeId, employeeName }: EmployeeAttendanceModalProps) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    noShows: 0,
    avgCheckIn: '',
    avgCheckOut: '',
  });
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: 'all', // 'all', 'present', 'no-show'
  });

  const fetchEmployeeRecords = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/attendance/attendance/', {
        employee_id: employeeId,
        month: filters.month,
        year: filters.year,
        status: filters.status,
      });

      setRecords(response.results || []);

      // Calculate statistics
      const presentRecords = response.results.filter((r: any) => r.department !== 'NO SHOW');
      const noShows = response.results.filter((r: any) => r.department === 'NO SHOW');

      // Calculate average check-in/out times
      const checkInTimes = presentRecords
        .map((r: any) => new Date(r.check_in))
        .filter(Boolean);
      const checkOutTimes = presentRecords
        .map((r: any) => r.check_out && new Date(r.check_out))
        .filter(Boolean);

      const avgCheckIn = checkInTimes.length
        ? format(new Date(
            checkInTimes.reduce((acc: any, time: any) => acc + time.getTime(), 0) / checkInTimes.length
          ), 'HH:mm')
        : '-';

      const avgCheckOut = checkOutTimes.length
        ? format(new Date(
            checkOutTimes.reduce((acc: any, time: any) => acc + time.getTime(), 0) / checkOutTimes.length
          ), 'HH:mm')
        : '-';

      setStats({
        totalDays: response.results.length,
        presentDays: presentRecords.length,
        noShows: noShows.length,
        avgCheckIn,
        avgCheckOut,
      });
    } catch (error) {
      console.error('Error fetching employee records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && employeeId) {
      fetchEmployeeRecords();
    }
  }, [open, employeeId, filters]);

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch (error) {
      return '-';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return '-';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography component="div" variant="h6">
            {employeeName}
          </Typography>
          <Typography 
            component="div" 
            variant="body2" 
            color="textSecondary" 
            sx={{ ml: 1 }}
          >
            ({employeeId})
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Statistics Summary */}
            <Box mb={3}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography component="div" variant="h6" gutterBottom>
                    Monthly Statistics for {employeeName}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography component="div" variant="body2" color="textSecondary">
                      Present Days
                    </Typography>
                    <Typography component="div" variant="h6">
                      {stats.presentDays}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography component="div" variant="body2" color="textSecondary">
                      No Shows
                    </Typography>
                    <Typography component="div" variant="h6">
                      {stats.noShows}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography component="div" variant="body2" color="textSecondary">
                      Attendance Rate
                    </Typography>
                    <Typography component="div" variant="h6">
                      {((stats.presentDays / stats.totalDays) * 100).toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography component="div" variant="body2" color="textSecondary">
                      Avg. Check-in
                    </Typography>
                    <Typography component="div" variant="h6">
                      {stats.avgCheckIn}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography component="div" variant="body2" color="textSecondary">
                      Avg. Check-out
                    </Typography>
                    <Typography component="div" variant="h6">
                      {stats.avgCheckOut}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Filters */}
            <Box mb={3}>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <TextField
                    select
                    fullWidth
                    label="Month"
                    value={filters.month}
                    onChange={(e) => setFilters(prev => ({ ...prev, month: Number(e.target.value) }))}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <MenuItem key={i + 1} value={i + 1}>
                        {format(new Date(2000, i, 1), 'MMMM')}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    select
                    fullWidth
                    label="Year"
                    value={filters.year}
                    onChange={(e) => setFilters(prev => ({ ...prev, year: Number(e.target.value) }))}
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      );
                    })}
                  </TextField>
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <MenuItem value="all">All Records</MenuItem>
                    <MenuItem value="present">Present Only</MenuItem>
                    <MenuItem value="no-show">No Shows Only</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Box>

            {/* Attendance Records Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Check In</TableCell>
                    <TableCell>Check Out</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Department</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((record) => (
                    <TableRow 
                      key={record.id}
                      sx={{ 
                        bgcolor: record.department === 'NO SHOW' ? '#fff3e0' : 'inherit'
                      }}
                    >
                      <TableCell>{formatDate(record.check_in)}</TableCell>
                      <TableCell>{formatTime(record.check_in)}</TableCell>
                      <TableCell>{record.check_out ? formatTime(record.check_out) : '-'}</TableCell>
                      <TableCell>{record.duration || '-'}</TableCell>
                      <TableCell>{record.department}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
} 