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
} from '@mui/material';
import { format, differenceInMinutes } from 'date-fns';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
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

interface AttendanceStats {
  status_distribution: { name: string; value: number }[];
  department_summary: { department: string; count: number }[];
  daily_trend: { date: string; count: number }[];
}

export default function AttendanceList() {
  const theme = useTheme();
  const { user } = useAuth();
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
  const [departments, setDepartments] = useState<string[]>([]);

  const isHrUser = useMemo(() => user?.group === 'HR', [user]);

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
        start_date: filters.start_date,
        end_date: filters.end_date,
        status: filters.status === 'all' ? '' : filters.status,
        department: filters.department,
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
  }, [page, rowsPerPage, filters]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = {
        start_date: filters.start_date,
        end_date: filters.end_date,
        status: filters.status === 'all' ? '' : filters.status,
        department: filters.department,
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
  }, [filters]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, [fetchRecords, fetchStats]);

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

  const getStatusChip = (record: any) => {
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
       } catch (e) { /* Ignore date parsing errors */ }
    }
    return <Chip label="Complete" color="success" size="small" variant="outlined" />;
  };

  // Memoize processed chart data to prevent recalculation on every render
  const pieChartData = useMemo(() => {
    try {
      // Ensure statsData and status_distribution exist and are arrays
      if (statsData && Array.isArray(statsData.status_distribution)) {
        return statsData.status_distribution.filter(d => d.value > 0);
      }
    } catch (e) {
      console.error("Error processing pie chart data:", e); // Log potential errors during processing
    }
    return []; // Return empty array in all other cases (null, undefined, not array, or error)
  }, [statsData]);

  const barChartData = useMemo(() => {
    try {
      if (statsData && Array.isArray(statsData.department_summary)) {
        return statsData.department_summary;
      }
    } catch (e) {
      console.error("Error processing bar chart data:", e);
    }
    return [];
  }, [statsData]);

  const lineChartData = useMemo(() => {
    try {
      if (statsData && Array.isArray(statsData.daily_trend)) {
        return statsData.daily_trend;
      }
    } catch(e) {
      console.error("Error processing line chart data:", e);
    }
    return [];
  }, [statsData]);

  const PIE_COLORS = useMemo(() => [
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.secondary.main
  ], [theme]);

  const handleFilterChange = (filterName: string, value: string | Date | null) => {
    let formattedValue = value;
    if (value instanceof Date) {
      try {
        formattedValue = format(value, 'yyyy-MM-dd');
      } catch (error) {
        console.error("Error formatting date:", error);
        formattedValue = ''; // Set to empty or handle error appropriately
      }
    }
    setFilters(prev => ({ ...prev, [filterName]: formattedValue }));
    setPage(0);
  };

  // Log memoized data before rendering
  console.log('[STATS] Memoized Pie Data:', pieChartData);
  console.log('[STATS] Memoized Bar Data:', barChartData);
  console.log('[STATS] Memoized Line Data:', lineChartData);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          Attendance Records & Statistics
        </Typography>
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Start Date"
                value={filters.start_date ? new Date(filters.start_date + 'T00:00:00') : null}
                onChange={(newValue) => handleFilterChange('start_date', newValue)}
                slotProps={{ textField: { fullWidth: true, size: 'small', InputLabelProps: { shrink: true } } }}
                format="yyyy-MM-dd"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="End Date"
                value={filters.end_date ? new Date(filters.end_date + 'T00:00:00') : null}
                onChange={(newValue) => handleFilterChange('end_date', newValue)}
                slotProps={{ textField: { fullWidth: true, size: 'small', InputLabelProps: { shrink: true } } }}
                format="yyyy-MM-dd"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
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
                onChange={(e) => handleFilterChange('department', e.target.value)}
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
          </Grid>
        </Paper>

        {/* Charts Section */}
        {loadingStats ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading statistics...</Typography>
          </Box>
        ) : statsData ? (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Status Distribution Pie Chart */}
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 2, height: 350 }}>
                <Typography variant="h6" gutterBottom align="center">Status Distribution</Typography>
                {(pieChartData.length > 0) ? (
                  <>
                    {console.log('[RENDER] Rendering Pie Chart, data length:', pieChartData.length)}
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
                          {statsData?.status_distribution?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%"><Typography>No status data</Typography></Box>
                )}
              </Paper>
            </Grid>
            {/* Department Summary Bar Chart */}
            <Grid item xs={12} md={8}>
               <Paper elevation={2} sx={{ p: 2, height: 350 }}>
                 <Typography variant="h6" gutterBottom align="center">Present Records by Department</Typography>
                 {(barChartData.length > 0) ? (
                   <>
                     {console.log('[RENDER] Rendering Bar Chart, data length:', barChartData.length)}
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={barChartData} margin={{ top: 5, right: 20, bottom: 60, left: 10 }}>
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis dataKey="department" angle={-45} textAnchor="end" interval={0} height={70} />
                         <YAxis allowDecimals={false} />
                         <Tooltip />
                         <Bar dataKey="count" fill={theme.palette.primary.main} name="Present Records" />
                       </BarChart>
                     </ResponsiveContainer>
                   </>
                 ) : (
                   <Box display="flex" justifyContent="center" alignItems="center" height="100%"><Typography>No department data</Typography></Box>
                 )}
               </Paper>
             </Grid>
             {/* Daily Trend Line Chart */}
             <Grid item xs={12}>
               <Paper elevation={2} sx={{ p: 2, height: 300 }}>
                 <Typography variant="h6" gutterBottom align="center">Daily Present Trend</Typography>
                 {(lineChartData.length > 0) ? (
                   <>
                     {console.log('[RENDER] Rendering Line Chart, data length:', lineChartData.length)}
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={lineChartData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis dataKey="date" />
                         <YAxis allowDecimals={false} />
                         <Tooltip />
                         <Legend />
                         <Line type="monotone" dataKey="count" stroke={theme.palette.success.dark} name="Present Records" />
                       </LineChart>
                     </ResponsiveContainer>
                   </>
                 ) : (
                   <Box display="flex" justifyContent="center" alignItems="center" height="100%"><Typography>No daily trend data</Typography></Box>
                 )}
               </Paper>
            </Grid>
          </Grid>
        ) : (
           <Box display="flex" justifyContent="center" py={5}>
             <Typography>Could not load statistics.</Typography>
           </Box>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={2}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'grey.200' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Employee ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Check In</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Check Out</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Duration (H:M)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                      No records found for the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => {
                    const isNoShow = record.department === 'NO SHOW';
                    const isMissingCheckout = !isNoShow && !record.check_out;
                    return (
                      <TableRow
                        key={record.id}
                        hover
                        sx={{
                          bgcolor: isNoShow 
                            ? 'error.lighter' 
                            : isMissingCheckout 
                              ? 'warning.lighter' 
                              : 'inherit',
                          '&:hover': { bgcolor: 'action.hover' },
                          cursor: 'pointer'
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
                            onClick={() => setSelectedEmployee({
                              id: record.employee_id,
                              name: record.employee_name,
                            })}
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
                              fontWeight: 'bold', 
                              color: isNoShow ? 'text.disabled' : 'success.dark'
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
                              color: isNoShow || isMissingCheckout ? 'text.disabled' : 'primary.dark'
                            }}
                          >
                            {record.check_out ? formatTime(record.check_out) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{record.duration ? record.duration.split(':').slice(0, 2).join(':') : '-'}</TableCell>
                        <TableCell>{getStatusChip(record)}</TableCell>
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
              onRowsPerPageChange={(event) => {
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
      </Box>
    </LocalizationProvider>
  );
} 