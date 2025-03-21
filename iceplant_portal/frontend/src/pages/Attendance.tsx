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
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import apiService from '../services/api';
import { AttendanceRecord } from '../types/api';

export default function Attendance() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    employee_id: '',
    department: '',
  });

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: page + 1,
        page_size: rowsPerPage,
      };
      const response = await apiService.get(apiService.endpoints.attendance, params);
      setRecords(response.results || []);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      enqueueSnackbar('Failed to fetch attendance records', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceRecords();
  }, [page, rowsPerPage, filters]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await apiService.upload(apiService.endpoints.importAttendance, file);
      enqueueSnackbar('Successfully imported attendance records', { variant: 'success' });
      fetchAttendanceRecords();
    } catch (error) {
      console.error('Error uploading file:', error);
      enqueueSnackbar('Failed to import attendance records', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(0);
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
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
          </TextField>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
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
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No attendance records found
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.employee_id}</TableCell>
                  <TableCell>{record.department}</TableCell>
                  <TableCell>{formatDateTime(record.check_in)}</TableCell>
                  <TableCell>
                    {record.check_out ? formatDateTime(record.check_out) : '-'}
                  </TableCell>
                  <TableCell>{record.duration || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={-1}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </TableContainer>
    </Box>
  );
} 