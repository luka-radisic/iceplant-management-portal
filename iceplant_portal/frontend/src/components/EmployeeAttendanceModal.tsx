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
  TablePagination,
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    noShows: 0,
    lateArrivals: 0,
    missingCheckouts: 0,
    avgCheckIn: '',
    avgCheckOut: '',
  });
  const [filters, setFilters] = useState({
    start_date: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end_date: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'),
    status: 'all', // 'all', 'present', 'no-show', 'late', 'missing-checkout'
  });

  const fetchEmployeeRecords = async () => {
    setLoading(true);
    try {
      // First, get all records for statistics (without pagination)
      const statsResponse = await apiService.get('/api/attendance/attendance/', {
        employee_id: employeeId,
        start_date: filters.start_date,
        end_date: filters.end_date,
        status: filters.status,
        page_size: 1000, // Large number to get all records for stats
      });

      // Calculate statistics from all records
      const allRecords = statsResponse.results || [];
      const presentRecords = allRecords.filter((r: any) => r.department !== 'NO SHOW');
      const noShows = allRecords.filter((r: any) => r.department === 'NO SHOW');
      const lateArrivals = presentRecords.filter((r: any) => {
        const checkInTime = new Date(r.check_in);
        return checkInTime.getHours() > 8 || (checkInTime.getHours() === 8 && checkInTime.getMinutes() > 0);
      });
      const missingCheckouts = presentRecords.filter((r: any) => !r.check_out);

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
        totalDays: allRecords.length,
        presentDays: presentRecords.length,
        noShows: noShows.length,
        lateArrivals: lateArrivals.length,
        missingCheckouts: missingCheckouts.length,
        avgCheckIn,
        avgCheckOut,
      });

      // Then get paginated records for display
      const response = await apiService.get('/api/attendance/attendance/', {
        employee_id: employeeId,
        start_date: filters.start_date,
        end_date: filters.end_date,
        status: filters.status,
        page: page + 1,
        page_size: rowsPerPage,
      });

      setRecords(response.results || []);
      setTotalCount(response.count || 0);
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
  }, [open, employeeId, filters, page, rowsPerPage]);

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
                    Attendance Statistics for Selected Period
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
                <Grid item xs={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography component="div" variant="body2" color="textSecondary">
                      Late Arrivals
                    </Typography>
                    <Typography component="div" variant="h6">
                      {stats.lateArrivals}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography component="div" variant="body2" color="textSecondary">
                      Missing Checkouts
                    </Typography>
                    <Typography component="div" variant="h6">
                      {stats.missingCheckouts}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography component="div" variant="body2" color="textSecondary">
                      Avg. Check-in
                    </Typography>
                    <Typography component="div" variant="h6">
                      {stats.avgCheckIn}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={3}>
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
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, start_date: e.target.value }));
                      setPage(0); // Reset to first page when changing filters
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, end_date: e.target.value }));
                      setPage(0); // Reset to first page when changing filters
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    value={filters.status}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, status: e.target.value }));
                      setPage(0); // Reset to first page when changing filters
                    }}
                  >
                    <MenuItem value="all">All Records</MenuItem>
                    <MenuItem value="present">Present Only</MenuItem>
                    <MenuItem value="no-show">No Shows Only</MenuItem>
                    <MenuItem value="late">Late Arrivals</MenuItem>
                    <MenuItem value="missing-checkout">Missing Checkouts</MenuItem>
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
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((record) => {
                    const isLate = new Date(record.check_in).getHours() >= 8;
                    const isMissingCheckout = !record.check_out;
                    
                    return (
                      <TableRow 
                        key={record.id}
                        sx={{ 
                          bgcolor: record.department === 'NO SHOW' ? '#fff3e0' : 'inherit'
                        }}
                      >
                        <TableCell>{formatDate(record.check_in)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {formatTime(record.check_in)}
                            {isLate && (
                              <Typography
                                component="span"
                                variant="caption"
                                color="error"
                                sx={{ ml: 1 }}
                              >
                                Late
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {record.check_out ? formatTime(record.check_out) : '-'}
                            {isMissingCheckout && (
                              <Typography
                                component="span"
                                variant="caption"
                                color="warning.main"
                                sx={{ ml: 1 }}
                              >
                                Missing
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{record.duration || '-'}</TableCell>
                        <TableCell>{record.department}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
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