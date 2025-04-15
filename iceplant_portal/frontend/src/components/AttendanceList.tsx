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
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Alert,
} from '@mui/material';
import { format, differenceInMinutes, differenceInHours, parseISO, addHours } from 'date-fns';
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
import HRApprovalButtons from './HRApprovalButtons';

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

  // Export handler: fetch all filtered records, format as CSV, and trigger download
  /**
   * CSV Export Tool
   * Exports up to 10,000 filtered attendance records with the following columns:
   * Employee ID, Name, Department, Date (YYYY-MM-DD), Day (Weekday), Check In, Check Out, Duration (min), Status, Checked, Approval Status, HR Note.
   * - All columns are always present and populated using the same formatting as the table.
   * - Export respects all current filters.
   * - See docs/attendance_page_enhancement_context.md for requirements and user feedback.
   * - Change documented in README.md (Change Log section).
   */
  const handleExport = async () => {
    try {
      // Build params for all records (no pagination)
      const params: any = {
        start_date: debouncedFilters.start_date,
        end_date: debouncedFilters.end_date,
        status: debouncedFilters.status === 'all' ? '' : debouncedFilters.status,
        department: debouncedFilters.department,
        process_checkins: 'false',
        sunday_only: debouncedFilters.sunday_only ? 'true' : undefined,
      };
      if (
        debouncedFilters.approval_status &&
        debouncedFilters.approval_status !== 'all'
      ) {
        params.approval_status = debouncedFilters.approval_status;
      }
      // Fetch all records (large page_size)
      const response = await apiService.get('/api/attendance/attendance/', {
        ...params,
        page: 1,
        page_size: 10000, // max 10,000 records
      });
      const allRecords = response.results || [];
      if (allRecords.length === 0) {
        alert('No records to export for the selected filters.');
        return;
      }
      // Prepare CSV header
      const header = [
        'Employee ID',
        'Name',
        'Department',
        'Date',
        'Day',
        'Check In',
        'Check Out',
        'Duration (min)',
        'Status',
        'Checked',
        'Approval Status',
        'HR Note'
      ];
      // Prepare CSV rows using the same formatting as the table
      const rows = allRecords.map((rec: any) => {
        // Date: YYYY-MM-DD
        let dateStr = '';
        if (rec.check_in) {
          try {
            dateStr = format(new Date(rec.check_in), 'yyyy-MM-dd');
          } catch {
            dateStr = rec.check_in ? String(rec.check_in).slice(0, 10) : '';
          }
        } else if (rec.date) {
          dateStr = String(rec.date).slice(0, 10);
        }
        // Day of week
        let dayStr = '';
        if (rec.check_in) {
          try {
            dayStr = format(new Date(rec.check_in), 'EEEE');
          } catch {
            dayStr = '';
          }
        } else if (rec.date) {
          try {
            dayStr = format(new Date(rec.date), 'EEEE');
          } catch {
            dayStr = '';
          }
        }
        // Check In/Out
        const checkIn = rec.check_in ? format(new Date(rec.check_in), 'HH:mm') : '';
        const checkOut = rec.check_out ? format(new Date(rec.check_out), 'HH:mm') : '';
        // Duration (min) - subtract 1 hour (60 min) for lunch break if duration >= 5 hours
        const durationMin =
          rec.check_in && rec.check_out
            ? (() => {
                const totalMinutes = Math.max(0, Math.round((new Date(rec.check_out).getTime() - new Date(rec.check_in).getTime()) / 60000));
                // If duration is 5+ hours, subtract 1 hour (60 min) lunch break
                return totalMinutes >= 300 ? totalMinutes - 60 : totalMinutes;
              })()
            : '';
        return [
          rec.employee_id || '',
          rec.employee_name || '',
          rec.department || '',
          dateStr,
          dayStr,
          checkIn,
          checkOut,
          durationMin,
          rec.status || '',
          rec.checked ? 'Yes' : 'No',
          rec.approval_status || '',
          rec.hr_note || ''
        ];
      });
      // Convert to CSV string
      const csvContent =
        [header, ...rows]
          .map(row => row.map(field =>
            typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))
              ? `"${field.replace(/"/g, '""')}"`
              : field
          ).join(','))
          .join('\r\n');
      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `attendance_export_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting attendance records:', error);
      alert('Failed to export attendance records.');
    }
  };
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
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [selectedHour, setSelectedHour] = useState('');
  const [selectedMinute, setSelectedMinute] = useState('');
  const [checkoutWarning, setCheckoutWarning] = useState(false);
  const [filters, setFilters] = useState({
    start_date: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end_date: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'),
    status: 'all',
    department: '',
    approval_status: 'all',
    sunday_only: false,
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
      const params: any = {
        page: page + 1,
        page_size: rowsPerPage,
        start_date: debouncedFilters.start_date,
        end_date: debouncedFilters.end_date,
        status: debouncedFilters.status === 'all' ? '' : debouncedFilters.status,
        department: debouncedFilters.department,
        process_checkins: 'false',
        sunday_only: debouncedFilters.sunday_only ? 'true' : undefined,
      };
      // Only include approval_status if not 'all' and not empty
      if (
        debouncedFilters.approval_status &&
        debouncedFilters.approval_status !== 'all'
      ) {
        params.approval_status = debouncedFilters.approval_status;
      }
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
  // Simplified function to fix the dialog issue
  const handleToggleChecked = async (record: any) => {
    try {
      // If already checked and trying to uncheck
      if (record.checked) {
        const confirmUncheck = window.confirm('Are you sure you want to uncheck this record?');
        if (!confirmUncheck) {
          return;
        }
        const updated = { checked: false };
        await apiService.patch(`/api/attendance/attendance/${record.id}/`, updated);
        setRecords((prev: any[]) =>
          prev.map((r: any) => (r.id === record.id ? { ...r, checked: false } : r))
        );
        return;
      }
      
      // If not checked and trying to check
      // Check if record has no check-out time and is not a NO SHOW
      if (!record.check_out && record.department !== 'NO SHOW') {
        // For records with missing check-out, show the dialog
        console.log("Record has no check-out time, opening dialog...");
        
        // Set current record
        setCurrentRecord(record);
        
        // Set default time to 8 hours after check-in
        try {
          const checkInTime = new Date(record.check_in);
          let suggestedCheckOut = new Date(checkInTime);
          suggestedCheckOut.setHours(suggestedCheckOut.getHours() + 8);
          
          const hours = suggestedCheckOut.getHours().toString().padStart(2, '0');
          const minutes = suggestedCheckOut.getMinutes().toString().padStart(2, '0');
          
          console.log(`Setting suggested time: ${hours}:${minutes}`);
          setSelectedHour(hours);
          setSelectedMinute(minutes);
        } catch (e) {
          console.error("Error setting default time:", e);
          setSelectedHour('17'); // Default to 5 PM
          setSelectedMinute('00');
        }
        
        console.log("About to open checkout dialog");
        setCheckoutDialogOpen(true);
        console.log("Set dialog open to true");
      } else {
        // If record has check-out time, mark as checked immediately
        console.log("Record already has check-out time, marking as checked");
        const updated = { checked: true };
        await apiService.patch(`/api/attendance/attendance/${record.id}/`, updated);
        setRecords((prev: any[]) =>
          prev.map((r: any) => (r.id === record.id ? { ...r, checked: true } : r))
        );
      }
    } catch (error) {
      console.error('Failed to update checked status:', error);
      alert('Failed to update checked status');
    }
  };

 // HRApprovalButtons handles approval/rejection logic now.


const fetchStats = useCallback(async () => {
 setLoadingStats(true);
 try {
   const params: any = {
     start_date: debouncedFilters.start_date,
     end_date: debouncedFilters.end_date,
     status: debouncedFilters.status === 'all' ? '' : debouncedFilters.status,
     department: debouncedFilters.department,
   };
   // Only include approval_status if not 'all' and not empty
   if (
     debouncedFilters.approval_status &&
     debouncedFilters.approval_status !== 'all'
   ) {
     params.approval_status = debouncedFilters.approval_status;
   }
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
    // If it's a No Show and Sunday, mark as Off Day (not No Show)
    if (record.no_show === true && isSunday(record.check_in)) {
      return <Chip label="Off Day" color="info" size="small" variant="outlined" />;
    }
    // Show "No Show" if the no_show flag is true, regardless of department or check_in
    if (record.no_show === true) {
      return <Chip label="No Show" color="error" size="small" variant="outlined" />;
    }

    if (isSunday(record.check_in)) {
      return (
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip label="Off Day" color="info" size="small" variant="outlined" />
          {!record.check_out ? (
            <Chip label="Missing Check-Out" color="warning" size="small" variant="outlined" />
          ) : null}
        </Box>
      );
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
        lineHeight: 1.5,
        margin: '0 auto'
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

        <Paper elevation={2} sx={{ p: 2, mb: 3, width: '100%' }}>
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
              {/* Sunday Work Only filter */}
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
            <Grid item xs={12} sm={6} md={3}>
              <Box display="flex" alignItems="center">
                <Box display="flex" alignItems="center" mr={2}>
                  <Switch
                    checked={filters.sunday_only}
                    onChange={e => {
                      setFilters(prev => ({
                        ...prev,
                        sunday_only: e.target.checked,
                      }));
                      setPage(0);
                    }}
                    color="primary"
                    inputProps={{ 'aria-label': 'Sunday Work Only' }}
                  />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Sunday Work Only
                  </Typography>
                </Box>
                <TextField
                  select
                  fullWidth
                  label="Approval Status"
                  value={filters.approval_status}
                  onChange={e => handleFilterChange('approval_status', e.target.value)}
                  size="small"
                  sx={{ minWidth: 220 }}
                  SelectProps={{
                    MenuProps: {
                      PaperProps: {
                        sx: { minWidth: 220 }
                      }
                    }
                  }}
                >
                  <MenuItem value="all">All Approval Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </TextField>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleExport}
                sx={{ height: '40px', mt: { xs: 2, sm: 0 }, ml: '120px' }}
              >
                Export CSV
              </Button>
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
              <Paper elevation={2} sx={{ p: 2, height: 350, width: '100%' }}>
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
              <Paper elevation={2} sx={{ p: 2, height: 350, width: '100%' }}>
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
              <Paper elevation={2} sx={{ p: 2, height: 300, width: '100%' }}>
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
          <TableContainer
            component={Paper}
            elevation={6}
            sx={{
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              width: '100%',
              overflowX: 'auto'
            }}
          >
            <Table size="small" stickyHeader sx={{
              fontSize: '12px',
              minWidth: 'max-content',
              '& th, & td': {
                padding: '4px 8px',
                whiteSpace: 'nowrap',
              },
              '& thead th': { backgroundColor: '#f0f0f0', fontWeight: 'bold' },
              '& tbody tr:hover': { backgroundColor: '#fafafa' },
              '& tbody tr:nth-of-type(odd)': { backgroundColor: '#fcfcfc' },
            }}>
              <TableHead sx={{ bgcolor: 'grey.300' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Dep</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Day</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>In</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Out</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Checked</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Approval</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>HR Note</TableCell>
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
                            : (index % 2 === 0 ? '#ffffff' : '#f9f9f9'),
                          transition: 'all 0.2s ease-in-out',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: '#d9f7be !important',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            zIndex: 1,
                          },
                        }}
                      >
                        <TableCell>{record.employee_id}</TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            p: 0
                          }}
                          title={record.employee_name}
                        >
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
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
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
                        <TableCell
                          sx={{
                            maxWidth: 120,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={record.department}
                        >
                          {record.department}
                        </TableCell>
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
                                  : record.manual_entry
                                    ? 'warning.dark'  // Orange color for manually entered times
                                    : 'primary.dark',
                              bgcolor: record.manual_entry ? 'warning.lighter' : 'transparent',
                              px: record.manual_entry ? 1 : 0,
                              py: record.manual_entry ? 0.5 : 0,
                              borderRadius: record.manual_entry ? 1 : 0,
                            }}
                          >
                            {record.check_out ? formatTime(record.check_out) : '-'}
                            {record.manual_entry && ' (Manual)'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {record.duration
                            ? (() => {
                                // Parse the duration string to get hours and minutes
                                const [hours, minutes] = record.duration.split(':').slice(0, 2).map(Number);
                                
                                // Calculate total minutes
                                const totalMinutes = hours * 60 + parseInt(minutes || '0');
                                
                                // If duration is 5+ hours, subtract 1 hour lunch break
                                const adjustedMinutes = totalMinutes >= 300 ? totalMinutes - 60 : totalMinutes;
                                
                                // Convert back to hours:minutes format
                                const adjustedHours = Math.floor(adjustedMinutes / 60);
                                const adjustedMins = adjustedMinutes % 60;
                                
                                return `${adjustedHours.toString().padStart(2, '0')}:${adjustedMins.toString().padStart(2, '0')}`;
                              })()
                            : '-'}
                        </TableCell>
                        <TableCell
                          // Override global nowrap for Status column to allow badge wrapping
                          sx={{
                            whiteSpace: 'normal !important',
                            wordBreak: 'break-word',
                            maxWidth: 220,
                            minWidth: 120,
                            p: '4px 8px'
                          }}
                        >
                          {getStatusChip(record)}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleToggleChecked(record)}
                            sx={{ minWidth: 'auto', padding: 0 }}
                          >
                            {record.checked ? (
                              <span style={{ color: '#4caf50', fontSize: '20px' }}>✔️</span>
                            ) : (
                              <span style={{ color: '#ccc', fontSize: '20px' }}>⭕</span>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {isHrUser ? (
                            <HRApprovalButtons
                              id={record.id}
                              currentStatus={record.approval_status}
                              requireReason={true}
                              onStatusChange={(newStatus, reason) => {
                                setRecords((prev: any[]) =>
                                  prev.map((r: any) =>
                                    r.id === record.id
                                      ? {
                                          ...r,
                                          approval_status: newStatus,
                                          ...(reason && { hr_notes: reason, hr_note_exists: true }),
                                        }
                                      : r
                                  )
                                );
                              }}
                              disabled={false}
                            />
                          ) : (
                            <Typography variant="body2" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                              {record.approval_status}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.hr_note_exists ? (
                            // light red color for notice mark
                            <Typography
                              variant="body2"
                              title="HR note present"
                              sx={{ fontWeight: 'bold', color: '#f28b82' }}
                            >
                              ⚠️
                            </Typography>
                          ) : (
                            '-'
                          )}
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

        {/* Checkout Time Dialog - with fixed implementation */}
        <Dialog 
          open={checkoutDialogOpen} 
          onClose={() => setCheckoutDialogOpen(false)}
          disableEscapeKeyDown
          keepMounted
          sx={{ zIndex: 1500 }}
        >
          <DialogTitle>Add Check-Out Time</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Typography variant="body1" gutterBottom>
                This record has no check-out time. Please add a check-out time to mark it as checked.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', mt: 2 }}>
                <FormControl sx={{ mr: 2, minWidth: 80 }} fullWidth>
                  <InputLabel id="hour-select-label">Hour</InputLabel>
                  <Select
                    labelId="hour-select-label"
                    value={selectedHour}
                    label="Hour"
                    onChange={(e) => {
                      console.log("Hour selected:", e.target.value);
                      setSelectedHour(e.target.value);
                      setCheckoutWarning(false);
                      if (currentRecord && e.target.value && selectedMinute) {
                        const checkInTime = new Date(currentRecord.check_in);
                        const checkOutTime = new Date(currentRecord.check_in);
                        checkOutTime.setHours(parseInt(e.target.value, 10));
                        checkOutTime.setMinutes(parseInt(selectedMinute, 10));
                        
                        // Calculate duration in hours, accounting for 1-hour lunch break
                        const totalHours = differenceInHours(checkOutTime, checkInTime);
                        const workHours = totalHours >= 5 ? totalHours - 1 : totalHours; // Subtract 1 hour for lunch if 5+ hours
                        if (workHours > 8) {
                          setCheckoutWarning(true);
                        }
                      }
                    }}
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                      <MenuItem key={hour} value={hour.toString().padStart(2, '0')}>
                        {hour.toString().padStart(2, '0')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 80 }} fullWidth>
                  <InputLabel id="minute-select-label">Minute</InputLabel>
                  <Select
                    labelId="minute-select-label"
                    value={selectedMinute}
                    label="Minute"
                    onChange={(e) => {
                      console.log("Minute selected:", e.target.value);
                      setSelectedMinute(e.target.value);
                      setCheckoutWarning(false);
                      if (currentRecord && selectedHour && e.target.value) {
                        const checkInTime = new Date(currentRecord.check_in);
                        const checkOutTime = new Date(currentRecord.check_in);
                        checkOutTime.setHours(parseInt(selectedHour, 10));
                        checkOutTime.setMinutes(parseInt(e.target.value, 10));
                        
                        // Calculate duration in hours
                        const durationHours = differenceInHours(checkOutTime, checkInTime);
                        if (durationHours > 8) {
                          setCheckoutWarning(true);
                        }
                      }
                    }}
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map(minute => (
                      <MenuItem key={minute} value={minute.toString().padStart(2, '0')}>
                        {minute.toString().padStart(2, '0')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              {checkoutWarning && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Warning: This check-out time will make the work duration longer than 8 hours. Please verify this is correct.
                </Alert>
              )}
              <FormHelperText>
                Select the check-out time for this attendance record
              </FormHelperText>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCheckoutDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={async () => {
                if (!currentRecord || !selectedHour || !selectedMinute) return;
                
                try {
                  // Create a date object for check-out based on check-in date
                  const checkInDate = new Date(currentRecord.check_in);
                  const checkOutDate = new Date(checkInDate);
                  
                  // Set the selected hours and minutes
                  checkOutDate.setHours(parseInt(selectedHour, 10));
                  checkOutDate.setMinutes(parseInt(selectedMinute, 10));
                  
                  // If check-out time is earlier than check-in time, assume it's the next day
                  if (checkOutDate < checkInDate) {
                    checkOutDate.setDate(checkOutDate.getDate() + 1);
                  }
                  
                  // Update the record with check-out time, checked=true, and manual_entry flag
                  const updated = { 
                    check_out: checkOutDate.toISOString(),
                    checked: true,
                    manual_entry: true
                  };
                  
                  await apiService.patch(`/api/attendance/attendance/${currentRecord.id}/`, updated);
                  
                  // Update local records state
                  setRecords((prev: any[]) =>
                    prev.map((r: any) => (r.id === currentRecord.id ? { ...r, check_out: checkOutDate.toISOString(), checked: true } : r))
                  );
                  
                  setCheckoutDialogOpen(false);
                  setCurrentRecord(null);
                  setSelectedHour('');
                  setSelectedMinute('');
                  setCheckoutWarning(false);
                } catch (error) {
                  console.error('Failed to update check-out time:', error);
                  alert('Failed to update check-out time');
                }
              }}
              color="primary"
              variant="contained"
              disabled={!selectedHour || !selectedMinute}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

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