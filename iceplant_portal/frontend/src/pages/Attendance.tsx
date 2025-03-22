import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Link,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import apiService, { endpoints } from '../services/api';
import { AttendanceRecord } from '../types/api';
import EmployeeAttendanceModal from '../components/EmployeeAttendanceModal';

export default function Attendance() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<{id: string; name: string} | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    employee_name: '',
    employee_id: '',
    department: '',
    start_date: '',
    end_date: '',
    status: 'all', // 'all', 'present', 'no-show'
  });

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: page + 1,
        page_size: rowsPerPage,
      };
      console.log('Fetching attendance with params:', params);
      const response = await apiService.get('/api/attendance/attendance/', params);
      console.log('API Response:', response);
      
      if (response.results) {
        setRecords(response.results);
        setTotalCount(response.count || 0);
      } else {
        console.error('Unexpected API response format:', response);
        enqueueSnackbar('Invalid response format from server', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        enqueueSnackbar(error.response.data.detail || 'Failed to fetch attendance records', { variant: 'error' });
      } else {
        enqueueSnackbar('Network error while fetching records', { variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceRecords();
  }, [page, rowsPerPage, filters]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      enqueueSnackbar('No file selected', { variant: 'error' });
      return;
    }

    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      enqueueSnackbar('Please select an Excel file (.xlsx or .xls)', { variant: 'error' });
      return;
    }

    setUploading(true);
    try {
      console.log('Starting file upload:', file.name);
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiService.upload(
        endpoints.importAttendance,
        file
      );

      console.log('Upload response:', response);
      enqueueSnackbar(response.message || 'Successfully imported attendance records', { variant: 'success' });
      fetchAttendanceRecords();
    } catch (error) {
      console.error('Error uploading file:', error);
      let errorMessage = 'Failed to upload file';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setUploading(false);
      // Reset the file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(0);
  };

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

  const handleEmployeeClick = (employeeId: string, employeeName: string) => {
    setSelectedEmployee({ id: employeeId, name: employeeName });
    setModalOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Attendance Records
        </Typography>
        <Box>
          <input
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            id="upload-file"
            onChange={handleFileUpload}
          />
          <label htmlFor="upload-file">
            <Button
              component="span"
              variant="contained"
              startIcon={<UploadIcon />}
              disabled={uploading}
              sx={{ mr: 1 }}
            >
              {uploading ? 'Uploading...' : 'Import XLSX'}
            </Button>
          </label>
          <IconButton onClick={() => fetchAttendanceRecords()} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Stack>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FilterIcon color="action" />
          <TextField
            name="employee_name"
            label="Employee Name"
            value={filters.employee_name}
            onChange={handleFilterChange}
            size="small"
          />
          <TextField
            name="employee_id"
            label="Employee ID"
            value={filters.employee_id}
            onChange={handleFilterChange}
            size="small"
          />
          <TextField
            name="department"
            label="Department"
            value={filters.department}
            onChange={handleFilterChange}
            size="small"
            select
          >
            <MenuItem value="">All Departments</MenuItem>
            <MenuItem value="Production">Production</MenuItem>
            <MenuItem value="Sales">Sales</MenuItem>
            <MenuItem value="Maintenance">Maintenance</MenuItem>
            <MenuItem value="Admin">Admin</MenuItem>
            <MenuItem value="Delivery">Delivery</MenuItem>
            <MenuItem value="NO SHOW">No Show</MenuItem>
          </TextField>
          <TextField
            name="start_date"
            label="Start Date"
            type="date"
            value={filters.start_date}
            onChange={handleFilterChange}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            name="end_date"
            label="End Date"
            type="date"
            value={filters.end_date}
            onChange={handleFilterChange}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            name="status"
            label="Status"
            value={filters.status}
            onChange={handleFilterChange}
            size="small"
            select
          >
            <MenuItem value="all">All Records</MenuItem>
            <MenuItem value="present">Present Only</MenuItem>
            <MenuItem value="no-show">No Shows Only</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Employee Name</TableCell>
              <TableCell>Employee ID</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Check In</TableCell>
              <TableCell>Check Out</TableCell>
              <TableCell>Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No attendance records found
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow 
                  key={record.id}
                  sx={{ 
                    bgcolor: record.department === 'NO SHOW' ? '#fff3e0' : 'inherit',
                    '&:hover': { bgcolor: record.department === 'NO SHOW' ? '#ffe0b2' : '#f5f5f5' }
                  }}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CalendarIcon fontSize="small" color="action" />
                      {formatDate(record.check_in)}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => handleEmployeeClick(record.employee_id, record.employee_name)}
                      sx={{ textDecoration: 'none', fontWeight: 500 }}
                      aria-label={`View attendance details for ${record.employee_name}`}
                      tabIndex={0}
                    >
                      {record.employee_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      component="div" 
                      variant="body2" 
                      color="textSecondary"
                      aria-label={`Employee ID: ${record.employee_id}`}
                    >
                      {record.employee_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={record.department}
                      color={record.department === 'NO SHOW' ? 'warning' : 'default'}
                      size="small"
                      aria-label={`Department: ${record.department}`}
                    />
                  </TableCell>
                  <TableCell aria-label={`Check in time: ${formatTime(record.check_in)}`}>
                    {formatTime(record.check_in)}
                  </TableCell>
                  <TableCell aria-label={`Check out time: ${record.check_out ? formatTime(record.check_out) : 'Not checked out'}`}>
                    {record.check_out ? formatTime(record.check_out) : '-'}
                  </TableCell>
                  <TableCell aria-label={`Duration: ${record.duration || 'Not available'}`}>
                    {record.duration || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelDisplayedRows={({ from, to, count }) => 
            `${from}–${to} of ${count !== -1 ? count : `more than ${to}`}`
          }
          labelRowsPerPage="Rows per page:"
        />
      </TableContainer>

      <EmployeeAttendanceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employeeId={selectedEmployee?.id || ''}
        employeeName={selectedEmployee?.name || ''}
      />
    </Box>
  );
} 