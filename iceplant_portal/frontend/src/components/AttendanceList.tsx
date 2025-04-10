import {
  Box,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Chip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
} from '@mui/material';
import { format, differenceInMinutes } from 'date-fns';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import apiService from '../services/api';
import EmployeeAttendanceModal from './EmployeeAttendanceModal';
import { useAuth } from '../contexts/AuthContext';
import { debounce } from 'lodash';
import AttendanceCleanupTool from './AttendanceCleanupTool';

interface AttendanceStats {
  status_distribution: { name: string; value: number }[];
  department_summary: { department: string; count: number }[];
  daily_trend: { date: string; count: number }[];

// TODO: In your attendance table row rendering, add this inside <TableRow>:
// <TableCell>
//   <Switch
//     checked={record.checked}
//     onChange={() => handleToggleChecked(record)}
//     color="primary"
//   />
// </TableCell>
}

export default function AttendanceList() {
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth() as { user: { group?: string } | null; isAuthenticated: boolean };
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<AttendanceStats | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [filters, setFilters] = useState({
    start_date: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end_date: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'),
    status: 'all',
    department: '',
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [departments, setDepartments] = useState<string[]>([]);
  const [cleanupOpen, setCleanupOpen] = useState(false);

  const isHrUser = useMemo(() => user?.group === 'HR', [user]);

  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedFilters(filters);
    }, 300);
    handler();
    return () => handler.cancel();
  }, [filters]);

  const fetchDepartments = async () => {
    try {
      const response = await apiService.getDepartments();
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        page_size: rowsPerPage,
        start_date: debouncedFilters.start_date,
        end_date: debouncedFilters.end_date,
        status: debouncedFilters.status === 'all' ? '' : debouncedFilters.status,
        department: debouncedFilters.department,
        process_checkins: 'false',
      };
      console.log('Fetching attendance records with params:', params);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 60000)
      );

      const fetchPromise = apiService.get('/api/attendance/attendance/', params);

      const response = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (!response) {
        throw new Error('No response from server');
      }

      console.log('Received response:', response);
      setRecords(response.results || []);
      setTotalCount(response.count || 0);
    } catch (error) {
      console.error('Error fetching records:', error);
      setRecords([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedFilters]);
  const handleToggleChecked = async (record: any) => {
    try {
      const updated = { checked: !record.checked };
      await apiService.patch(`/api/attendance/attendance/${record.id}/`, updated);
      setRecords((prev: any[]) =>
        prev.map((r: any) => (r.id === record.id ? { ...r, checked: updated.checked } : r))
      );
    } catch (error) {
      console.error('Failed to update checked status:', error);
      alert('Failed to update checked status');
    }
  };

 async function handleUpdateAttendanceApprovalStatus(id: number, status: string) {
   try {
     await apiService.patch(`/api/attendance/attendance/${id}/`, { approval_status: status });
     setRecords((prev: any[]) =>
       prev.map((record: any) =>
         record.id === id ? { ...record, approval_status: status } : record
       )
     );
   } catch (error) {
     console.error('Failed to update approval status:', error);
   }
 }


const fetchStats = useCallback(async () => {
 setLoadingStats(true);
 try {
   const params = {
     start_date: debouncedFilters.start_date,
     end_date: debouncedFilters.end_date,
     status: debouncedFilters.status === 'all' ? '' : debouncedFilters.status,
     department: debouncedFilters.department,
   };
   console.log('[STATS] Fetching attendance stats with params:', params);
   const stats = await apiService.getAttendanceStats(params);
   console.log('[STATS] Received RAW stats data:', JSON.stringify(stats, null, 2));
   setStatsData(stats);
 } catch (error) {
   console.error('[STATS] Error fetching attendance stats:', error);
   setStatsData(null);
 } finally {
   setLoadingStats(false);
 }
}, [debouncedFilters]);

  // TODO: In your attendance table row rendering, add this inside <TableRow>:
  // <TableCell>
  //   <Switch
  //     checked={record.checked}
  //     onChange={() => handleToggleChecked(record)}
  //     color="primary"
  //   />
  // </TableCell>

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchDepartments();
  }, [isAuthenticated]);

  useEffect(() => {

    if (!isAuthenticated) return;
    fetchRecords();
    fetchStats();
  }, [fetchRecords, fetchStats, isAuthenticated]);

  const formatTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch (error) {
      return 'Invalid Time';
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatDayOfWeek = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'EEEE');
    } catch (error) {
      return 'Invalid Day';
    }
  };

  const isSunday = (dateString: string | null): boolean => {
    if (!dateString) return false;
    try {
      return format(new Date(dateString), 'EEEE') === 'Sunday';
    } catch (error) {
      return false;
    }
  };

  const getStatusChip = (record: any) => {
    if (isSunday(record.check_in)) {
      return (
        <Box display="flex" gap={1}>
          <Chip label="Off Day" color="info" size="small" variant="outlined" />
          {record.department === 'NO SHOW' ? (
            <Chip label="No Show" color="error" size="small" variant="outlined" />
          ) : null}
          {!record.check_out && record.department !== 'NO SHOW' ? (
            <Chip label="Missing Check-Out" color="warning" size="small" variant="outlined" />
          ) : null}
        </Box>
      );
    }

    if (record.department === 'NO SHOW') {
      return <Chip label="No Show" color="error" size="small" variant="outlined" />;
    }
    if (!record.check_out) {
      return <Chip label="Missing Check-Out" color="warning" size="small" variant="outlined" />;
    }
    if (record.check_in && record.check_out) {
      try {
        const durationMinutes = differenceInMinutes(new Date(record.check_out), new Date(record.check_in));
        if (durationMinutes < 5) {
          return <Chip label="Short Duration" color="secondary" size="small" variant="outlined" />;
        }
      } catch (e) {}
    }
    return <Chip label="Complete" color="success" size="small" variant="outlined" />;
  };

  const pieChartData = useMemo(() => {
    try {
      if (statsData && Array.isArray(statsData.status_distribution)) {
        return statsData.status_distribution.filter(d => d.value > 0);
      }
    } catch (e) {
      console.error('Error processing pie chart data:', e);
    }
    return [];
  }, [statsData]);

  const barChartData = useMemo(() => {
    try {
      if (statsData && Array.isArray(statsData.department_summary)) {
        return statsData.department_summary;
      }
    } catch (e) {
      console.error('Error processing bar chart data:', e);
    }
    return [];
  }, [statsData]);

  const lineChartData = useMemo(() => {
    try {
      if (statsData && Array.isArray(statsData.daily_trend)) {
        return statsData.daily_trend;
      }
    } catch (e) {
      console.error('Error processing line chart data:', e);
    }
    return [];
  }, [statsData]);

  const PIE_COLORS = useMemo(
    () => [
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      theme.palette.secondary.main,
    ],
    [theme]
  );

  const handleFilterChange = (filterName: string, value: string | Date | null) => {
    let formattedValue = value;
    if (value instanceof Date) {
      try {
        formattedValue = format(value, 'yyyy-MM-dd');
      } catch (error) {
        console.error('Error formatting date:', error);
        formattedValue = '';
      }
    }
    setFilters(prev => ({ ...prev, [filterName]: formattedValue }));
    setPage(0);
  };

  console.log('[STATS] Memoized Pie Data:', pieChartData);
  console.log('[STATS] Memoized Bar Data:', barChartData);
  console.log('[STATS] Memoized Line Data:', lineChartData);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{
        p: 2,
        fontFamily: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
        fontSize: '15px',
        lineHeight: 1.5
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">
            Attendance Records & Statistics
          </Typography>
          {isHrUser && (
            <Button variant="outlined" color="error" onClick={() => setCleanupOpen(true)}>
              Cleanup Attendance Records
            </Button>
          )}
        </Box>

        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Start Date"
                value={filters.start_date ? new Date(filters.start_date + 'T00:00:00') : null}
                onChange={newValue => handleFilterChange('start_date', newValue)}
                slotProps={{
                  textField: { fullWidth: true, size: 'small', InputLabelProps: { shrink: true } },
                }}
                format="yyyy-MM-dd"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="End Date"
                value={filters.end_date ? new Date(filters.end_date + 'T00:00:00') : null}
                onChange={newValue => handleFilterChange('end_date', newValue)}
                slotProps={{
                  textField: { fullWidth: true, size: 'small', InputLabelProps: { shrink: true } },
                }}
                format="yyyy-MM-dd"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Status"
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
                size="small"
              >
                <MenuItem value="all">All Records</MenuItem>
                <MenuItem value="present">Present</MenuItem>
                <MenuItem value="no-show">No Show</MenuItem>
                <MenuItem value="missing-checkout">Missing Check-Out</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Department"
                value={filters.department}
                onChange={e => handleFilterChange('department', e.target.value)}
                size="small"
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {loadingStats ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading statistics...</Typography>
          </Box>
        ) : statsData ? (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, height: 350 }}>
                <Typography variant="h6" gutterBottom align="center">
                  Status Distribution
                </Typography>
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 40, left: 0 }}>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {statsData?.status_distribution?.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography>No attendance statistics available for this period.</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={8}>
              <Paper elevation={2} sx={{ p: 2, height: 350 }}>
                <Typography variant="h6" gutterBottom align="center">
                  Present Records by Department
                </Typography>
                {barChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 5, right: 20, bottom: 60, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" angle={-45} textAnchor="end" interval={0} height={70} />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill={theme.palette.primary.main} name="Present Records" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography>No department data available.</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 2, height: 300 }}>
                <Typography variant="h6" gutterBottom align="center">
                  Daily Present Trend
                </Typography>
                {lineChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke={theme.palette.success.dark}
                        name="Present Records"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography>No daily trend data available.</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Box display="flex" justifyContent="center" py={5}>
            <Typography>Could not load statistics.</Typography>
          </Box>
        )}

        {!loading && records.length === 0 && (
          <Box display="flex" justifyContent="center" py={5}>
            <Typography>No attendance records found for the selected date range.</Typography>
          </Box>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={6} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <Table size="small" stickyHeader sx={{
              '& thead th': { backgroundColor: '#f0f0f0', fontWeight: 'bold' },
              '& tbody tr:hover': { backgroundColor: '#fafafa' },
              '& tbody tr:nth-of-type(odd)': { backgroundColor: '#fcfcfc' },
            }}>
              <TableHead sx={{ bgcolor: 'grey.300' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Employee ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Day</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Check In</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Check Out</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Duration (H:M)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>HR Note</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Checked</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>HR Approval</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                      No records found for the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record, index) => {
                    const isNoShow = record.department === 'NO SHOW';
                    const isMissingCheckout = !isNoShow && !record.check_out;
                    const isOffDay = isSunday(record.check_in);
                    return (
                      <TableRow
                        key={record.id}
                        hover
                        sx={{
                          bgcolor: isOffDay
                            ? 'info.lighter'
                            : isNoShow
                            ? 'error.lighter'
                            : isMissingCheckout
                            ? 'warning.lighter'
                            : (index % 2 === 0 ? 'grey.50' : 'white'),
                          '&:hover': { bgcolor: 'grey.100' },
                          cursor: 'pointer',
                          transition: 'background-color 0.3s ease',
                        }}
                      >
                        <TableCell>{record.employee_id}</TableCell>
                        <TableCell>
                          <Button
                            variant="text"
                            size="small"
                            sx={{
                              textTransform: 'none',
                              padding: 0,
                              minWidth: 'auto',
                              textAlign: 'left',
                              fontWeight: 500,
                              color: 'text.primary',
                            }}
                            onClick={() =>
                              setSelectedEmployee({
                                id: record.employee_id,
                                name: record.employee_name,
                              })
                            }
                          >
                            {record.employee_name}
                          </Button>
                        </TableCell>
                        <TableCell>{record.department}</TableCell>
                        <TableCell>{formatDate(record.check_in)}</TableCell>
                        <TableCell>
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{
                              fontWeight: isOffDay ? 'bold' : 'normal',
                              color: isOffDay ? 'info.dark' : 'text.primary',
                            }}
                          >
                            {formatDayOfWeek(record.check_in)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{
                              fontWeight: 'bold',
                              color: isNoShow ? 'text.disabled' : 'success.dark',
                            }}
                          >
                            {isNoShow ? '-' : formatTime(record.check_in)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{
                              fontWeight: 'bold',
                              color:
                                isNoShow || isMissingCheckout
                                  ? 'text.disabled'
                                  : 'primary.dark',
                            }}
                          >
                            {record.check_out ? formatTime(record.check_out) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {record.duration
                            ? record.duration.split(':').slice(0, 2).join(':')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusChip(record)}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={record.checked}
                            onChange={() => handleToggleChecked(record)}
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            color="success"
                            onClick={() => handleUpdateAttendanceApprovalStatus(record.id, 'approved')}
                          >
                            Approve
                          </Button>
                        </TableCell>
                        <TableCell>
                          {record.hr_note || '-'}
                        </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={event => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100, 200]}
              sx={{ borderTop: '1px solid', borderColor: 'divider' }}
            />


          </TableContainer>
        )}

        {selectedEmployee && (
          <EmployeeAttendanceModal
            open={!!selectedEmployee}
            onClose={() => setSelectedEmployee(null)}
            employeeId={selectedEmployee.id}
            employeeName={selectedEmployee.name}
            isHrUser={isHrUser}
          />
        )}

        <Dialog open={cleanupOpen} onClose={() => setCleanupOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Attendance Database Cleanup</DialogTitle>
          <DialogContent dividers>
            <AttendanceCleanupTool />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCleanupOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}