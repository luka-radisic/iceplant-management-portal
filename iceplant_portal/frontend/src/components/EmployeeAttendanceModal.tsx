import { Settings as SettingsIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { addHours, format, parse } from 'date-fns';
import { format as formatTZ } from 'date-fns-tz';
import { useEffect, useState } from 'react';
import apiService from '../services/api';

// Shift configuration type
interface ShiftConfig {
  shift_start: string;
  shift_end: string;
  break_duration: number;
  is_night_shift: boolean;
}

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
  const [showShiftConfig, setShowShiftConfig] = useState(false);
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig>({
    shift_start: '06:00',
    shift_end: '16:00',
    break_duration: 2,
    is_night_shift: false,
  });
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    noShows: 0,
    lateArrivals: 0,
    missingCheckouts: 0,
    morningShifts: 0,
    nightShifts: 0,
    avgCheckIn: '',
    avgCheckOut: '',
  });
  const [filters, setFilters] = useState({
    start_date: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end_date: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'),
    status: 'all', // 'all', 'present', 'no-show', 'late', 'missing-checkout', 'morning-shift', 'night-shift'
  });

  // Function to fetch employee's shift configuration
  const fetchEmployeeShift = async () => {
    try {
      const response = await apiService.get(`/api/attendance/employee-shift/${employeeId}/`);
      if (response) {
        setShiftConfig({
          shift_start: response.shift_start,
          shift_end: response.shift_end,
          break_duration: response.break_duration,
          is_night_shift: response.is_night_shift,
        });
      }
    } catch (error) {
      console.error('Error fetching employee shift:', error);
    }
  };

  // Function to save employee's shift configuration
  const saveEmployeeShift = async () => {
    try {
      await apiService.post(`/api/attendance/employee-shift/${employeeId}/`, shiftConfig);
    } catch (error) {
      console.error('Error saving employee shift:', error);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      // Convert UTC to Manila time
      const date = new Date(dateString);
      return formatTZ(date, 'HH:mm', { timeZone: 'Asia/Manila' });
    } catch (error) {
      return '-';
    }
  };

  const formatDateStr = (dateString: string) => {
    try {
      // Convert UTC to Manila time
      const date = new Date(dateString);
      return formatTZ(date, 'MMM dd, yyyy', { timeZone: 'Asia/Manila' });
    } catch (error) {
      return '-';
    }
  };

  // Function to determine shift type and validate time
  const getShiftType = (checkInTime: Date): string => {
    const timeStr = formatTZ(checkInTime, 'HH:mm', { timeZone: 'Asia/Manila' });
    const manilaDate = new Date(formatTZ(checkInTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Asia/Manila' }));
    const shiftStartTime = parse(shiftConfig.shift_start, 'HH:mm', manilaDate);
    const shiftEndTime = parse(shiftConfig.shift_end, 'HH:mm', manilaDate);

    // Add 1 hour grace period for check-in
    const graceEndTime = addHours(shiftStartTime, 1);

    if (shiftConfig.is_night_shift) {
      // For night shift, check if time is between start time and midnight
      // or between midnight and end time next day
      const isInNightShift = (
        (timeStr >= shiftConfig.shift_start && timeStr <= '23:59') ||
        (timeStr >= '00:00' && timeStr <= shiftConfig.shift_end)
      );

      if (isInNightShift) {
        return 'Night Shift';
      }
    } else {
      // For morning shift, simply check if time is between start and end
      if (timeStr >= shiftConfig.shift_start && timeStr <= shiftConfig.shift_end) {
        return 'Morning Shift';
      }
    }

    return 'Outside Shift Hours';
  };

  // Function to determine if a check-in is late
  const isLateForShift = (checkInTime: Date): boolean => {
    const timeStr = formatTZ(checkInTime, 'HH:mm', { timeZone: 'Asia/Manila' });
    const manilaDate = new Date(formatTZ(checkInTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Asia/Manila' }));
    const shiftStartTime = parse(shiftConfig.shift_start, 'HH:mm', manilaDate);
    const graceEndTime = addHours(shiftStartTime, 1); // 1 hour grace period

    return checkInTime > graceEndTime;
  };

  const fetchEmployeeRecords = async () => {
    setLoading(true);
    try {
      // First, get all records for statistics (without pagination)
      const statsResponse = await apiService.get('/api/attendance/attendance/', {
        employee_id: employeeId,
        start_date: filters.start_date,
        end_date: filters.end_date,
        status: filters.status,
        page_size: 1000,
      });

      // Calculate statistics from all records
      const allRecords = statsResponse.results || [];
      const presentRecords = allRecords.filter((r: any) => r.department !== 'NO SHOW');
      const noShows = allRecords.filter((r: any) => r.department === 'NO SHOW');

      // Calculate shift-based statistics
      const recordsWithShifts = presentRecords.map(record => ({
        ...record,
        checkInTime: new Date(record.check_in),
        shiftType: getShiftType(new Date(record.check_in)),
      }));

      const morningShifts = recordsWithShifts.filter(r => r.shiftType === 'Morning Shift');
      const nightShifts = recordsWithShifts.filter(r => r.shiftType === 'Night Shift');

      const lateArrivals = recordsWithShifts.filter(r => isLateForShift(r.checkInTime));
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
        morningShifts: morningShifts.length,
        nightShifts: nightShifts.length,
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

      // Add shift information to records
      const enrichedRecords = (response.results || []).map(record => ({
        ...record,
        shiftType: getShiftType(new Date(record.check_in)),
      }));

      setRecords(enrichedRecords);
      setTotalCount(response.count || 0);
    } catch (error) {
      console.error('Error fetching employee records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && employeeId) {
      fetchEmployeeShift();
      fetchEmployeeRecords();
    }
  }, [open, employeeId, filters, page, rowsPerPage]);

  const ShiftConfigDialog = () => (
    <Dialog open={showShiftConfig} onClose={() => setShowShiftConfig(false)}>
      <DialogTitle>Shift Configuration for {employeeName}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              label="Shift Start Time"
              type="time"
              value={shiftConfig.shift_start}
              onChange={(e) => setShiftConfig(prev => ({ ...prev, shift_start: e.target.value }))}
              fullWidth
              margin="dense"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Shift End Time"
              type="time"
              value={shiftConfig.shift_end}
              onChange={(e) => setShiftConfig(prev => ({ ...prev, shift_end: e.target.value }))}
              fullWidth
              margin="dense"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Break Duration (hours)"
              type="number"
              value={shiftConfig.break_duration}
              onChange={(e) => setShiftConfig(prev => ({ ...prev, break_duration: Number(e.target.value) }))}
              fullWidth
              margin="dense"
              InputProps={{ inputProps: { min: 0, max: 24 } }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={shiftConfig.is_night_shift}
                  onChange={(e) => setShiftConfig(prev => ({ ...prev, is_night_shift: e.target.checked }))}
                />
              }
              label="Night Shift (ends next day)"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowShiftConfig(false)}>Cancel</Button>
        <Button onClick={async () => {
          await saveEmployeeShift();
          setShowShiftConfig(false);
          fetchEmployeeRecords();
        }} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <Tooltip title="Configure Shifts">
            <IconButton onClick={() => setShowShiftConfig(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
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
                <Grid item xs={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography component="div" variant="body2" color="textSecondary">
                      Morning Shifts
                    </Typography>
                    <Typography component="div" variant="h6">
                      {stats.morningShifts}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography component="div" variant="body2" color="textSecondary">
                      Night Shifts
                    </Typography>
                    <Typography component="div" variant="h6">
                      {stats.nightShifts}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography component="div" variant="body2" color="textSecondary">
                      No Shows
                    </Typography>
                    <Typography component="div" variant="h6">
                      {stats.noShows}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={3}>
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
                      setPage(0);
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
                      setPage(0);
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
                      setPage(0);
                    }}
                  >
                    <MenuItem value="all">All Records</MenuItem>
                    <MenuItem value="morning-shift">Morning Shift</MenuItem>
                    <MenuItem value="night-shift">Night Shift</MenuItem>
                    <MenuItem value="no-show">No Shows</MenuItem>
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
                    <TableCell>Shift</TableCell>
                    <TableCell>Check In</TableCell>
                    <TableCell>Check Out</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((record) => {
                    const checkInTime = new Date(record.check_in);
                    const isLate = isLateForShift(checkInTime);
                    const isMissingCheckout = !record.check_out;

                    return (
                      <TableRow
                        key={record.id}
                        sx={{
                          bgcolor: record.department === 'NO SHOW' ? '#fff3e0' : 'inherit'
                        }}
                      >
                        <TableCell>{formatDateStr(record.check_in)}</TableCell>
                        <TableCell>
                          <Typography
                            component="span"
                            variant="body2"
                            color={record.shiftType === 'Outside Shift Hours' ? 'error' : 'textPrimary'}
                          >
                            {record.shiftType}
                          </Typography>
                        </TableCell>
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
      <ShiftConfigDialog />
    </Dialog>
  );
} 