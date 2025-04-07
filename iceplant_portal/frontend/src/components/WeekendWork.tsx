import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';

interface WeekendRecord {
  id: number;
  employee_name: string;
  date: string;
  punch_in: string;
  punch_out: string;
  duration: string;
  department: string;
  has_hr_note: boolean;
}

const WeekendWork: React.FC = () => {
  const [records, setRecords] = useState<WeekendRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  const [startDate, setStartDate] = useState<Date | null>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  const fetchWeekendWork = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('end_date', format(endDate, 'yyyy-MM-dd'));
      params.append('page', (page + 1).toString());
      params.append('page_size', rowsPerPage.toString());

      const response = await fetch(`/api/attendance/attendance/weekend-work/?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch weekend work data');
      }
      const data = await response.json();
      setRecords(data.results || data);  // support paginated or full list
      setTotalCount(data.count || data.length || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, page, rowsPerPage]);

  useEffect(() => {
    fetchWeekendWork();
  }, [fetchWeekendWork]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleExport = (formatType: 'excel' | 'pdf') => {
    // Placeholder for export logic
    alert(`Exporting weekend work data as ${formatType.toUpperCase()}`);
  };

  const uniqueEmployees = new Set(records.map(r => r.employee_name)).size;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Summary
      </Typography>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} textAlign="center">
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              {totalCount}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Total Records
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4} textAlign="center">
            <Typography variant="h4" fontWeight="bold" color="secondary.main">
              {uniqueEmployees}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Employees
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4} textAlign="center">
            <Typography variant="body1" fontWeight="bold">
              Date Range
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {startDate ? format(startDate, 'yyyy-MM-dd') : 'N/A'} to {endDate ? format(endDate, 'yyyy-MM-dd') : 'N/A'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h6" gutterBottom>
        Weekend Work Records
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => setStartDate(date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(date) => setEndDate(date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} container spacing={1} justifyContent="flex-end">
            <Grid item>
              <Button variant="contained" onClick={() => handleExport('excel')}>
                Export Excel
              </Button>
            </Grid>
            <Grid item>
              <Button variant="contained" onClick={() => handleExport('pdf')}>
                Export PDF
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Paper>
          <TableContainer>
            <Table size="small" stickyHeader sx={{
              '& thead th': { backgroundColor: '#f0f0f0', fontWeight: 'bold' },
              '& tbody tr:hover': { backgroundColor: '#fafafa' },
              '& tbody tr:nth-of-type(odd)': { backgroundColor: '#fcfcfc' }
            }}>
              <TableHead>
                <TableRow>
                  <TableCell>Employee Name</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Punch In</TableCell>
                  <TableCell>Punch Out</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>HR Note</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => alert(`Open profile for ${record.employee_name}`)}
                        sx={{ textTransform: 'none', fontWeight: 'bold' }}
                      >
                        {record.employee_name}
                      </Button>
                    </TableCell>
                    <TableCell>{record.department}</TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.punch_in}</TableCell>
                    <TableCell>{record.punch_out}</TableCell>
                    <TableCell>{record.duration}</TableCell>
                    <TableCell>
                      {record.has_hr_note && (
                        <span title="HR Note attached" style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '18px' }}>
                          &#9888;
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      )}
    </Box>
  );
};

export default WeekendWork;