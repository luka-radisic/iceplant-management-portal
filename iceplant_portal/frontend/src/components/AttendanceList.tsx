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
} from '@mui/material';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import apiService from '../services/api';
import EmployeeAttendanceModal from './EmployeeAttendanceModal';

export default function AttendanceList() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
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

  const fetchDepartments = async () => {
    try {
      const response = await apiService.getDepartments();
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/api/attendance/attendance/', {
        page: page + 1,
        page_size: rowsPerPage,
        start_date: filters.start_date,
        end_date: filters.end_date,
        status: filters.status,
        department: filters.department,
      });
      setRecords(response.results || []);
      setTotalCount(response.count || 0);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [page, rowsPerPage, filters]);

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
    <Box>
      {/* Filters */}
      <Box mb={3}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Attendance Records
            </Typography>
          </Grid>
          <Grid item xs={3}>
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
          <Grid item xs={3}>
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
          <Grid item xs={3}>
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
              <MenuItem value="present">Present</MenuItem>
              <MenuItem value="no-show">No Shows</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={3}>
            <TextField
              select
              fullWidth
              label="Department"
              value={filters.department}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, department: e.target.value }));
                setPage(0);
              }}
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
      </Box>

      {/* Records Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Check In</TableCell>
                <TableCell>Check Out</TableCell>
                <TableCell>Duration</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((record) => (
                <TableRow
                  key={record.id}
                  sx={{
                    bgcolor: record.department === 'NO SHOW' ? '#fff3e0' : 'inherit',
                  }}
                >
                  <TableCell>{record.employee_id}</TableCell>
                  <TableCell>
                    <Button
                      sx={{
                        textTransform: 'none',
                        padding: 0,
                        minWidth: 'auto',
                        textAlign: 'left',
                        fontWeight: 'normal',
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
                  <TableCell>{formatTime(record.check_in)}</TableCell>
                  <TableCell>{record.check_out ? formatTime(record.check_out) : '-'}</TableCell>
                  <TableCell>{record.duration || '-'}</TableCell>
                </TableRow>
              ))}
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
          />
        </TableContainer>
      )}

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <EmployeeAttendanceModal
          open={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
        />
      )}
    </Box>
  );
} 