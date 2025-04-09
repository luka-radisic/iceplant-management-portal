import React, { useState, useEffect, useCallback } from 'react';


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
  approval_status: string;
}

const WeekendWork: React.FC = () => {
  const [records, setRecords] = useState<WeekendRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('');
  const [weekendDaysFilter, setWeekendDaysFilter] = useState<string>('5,6'); // default Saturday, Sunday

  const fetchWeekendWork = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('end_date', format(endDate, 'yyyy-MM-dd'));
      params.append('page', (page + 1).toString());
      params.append('page_size', rowsPerPage.toString());

      if (departmentFilter) params.append('department', departmentFilter);
      if (employeeFilter) params.append('employee_id', employeeFilter);
      if (approvalStatusFilter) params.append('approval_status', approvalStatusFilter);
      if (weekendDaysFilter) params.append('weekend_days', weekendDaysFilter);

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

  const handleExport = async (formatType: 'excel' | 'pdf') => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('end_date', format(endDate, 'yyyy-MM-dd'));
      params.append('page_size', '100000');  // large number to get all data

      const response = await fetch(`/api/attendance/attendance/weekend-work/?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch all weekend work data');
      const data = await response.json();
      const allRecords = data.results || data;

      const headers = ['Employee Name', 'Department', 'Date', 'Punch In', 'Punch Out', 'Duration', 'HR Note'];
      const rows = allRecords.map((r: any) => [
        r.employee_name,
        r.department,
        r.date,
        r.punch_in,
        r.punch_out,
        r.duration,
        r.has_hr_note ? 'Yes' : 'No'
      ]);

      if (formatType === 'excel') {
        const csvContent = [headers, ...rows]
          .map(e => e.map((field: any) => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'weekend_work.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (formatType === 'pdf') {
        const doc = new (await import('jspdf')).jsPDF();
        const autoTable = (await import('jspdf-autotable')).default;
        autoTable(doc, {
          head: [headers],
          body: rows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [41, 128, 185] }
        });
        doc.save('weekend_work.pdf');
      }
    } catch (error) {
      alert('Export failed: ' + (error as Error).message);
    }
  };

  const uniqueEmployees = new Set(records.map(r => r.employee_name)).size;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Summary
      </Typography>
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              {totalCount}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Total Records
            </Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight="bold" color="secondary.main">
              {uniqueEmployees}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Employees
            </Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="body1" fontWeight="bold">
              Date Range
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {startDate ? format(startDate, 'dd MMM yyyy') : 'N/A'} to {endDate ? format(endDate, 'dd MMM yyyy') : 'N/A'}
            </Typography>
          </Box>
        </Box>
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
          <Grid item xs={12} sm={3}>
            <TextField
              label="Department"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Employee ID"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Approval Status"
              value={approvalStatusFilter}
              onChange={(e) => setApprovalStatusFilter(e.target.value)}
              placeholder="pending, approved, rejected"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Weekend Days (comma-separated)"
              value={weekendDaysFilter}
              onChange={(e) => setWeekendDaysFilter(e.target.value)}
              placeholder="5,6"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} container spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
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
        <Paper elevation={6} sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)', borderRadius: 2 }}>
          <TableContainer>
            <Table size="small" stickyHeader sx={{
              '& thead th': { backgroundColor: '#f0f0f0', fontWeight: 'bold' },
              '& tbody tr:hover': { backgroundColor: '#fafafa' },
              '& tbody tr:nth-of-type(odd)': { backgroundColor: '#fcfcfc' },
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
                  <TableCell>Approval Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record) => (
                  <TableRow
                    key={record.id}
                    hover
                    onClick={() => setSelectedRowId(record.id)}
                    selected={selectedRowId === record.id}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: selectedRowId === record.id ? '#d0f0c0' : undefined,
                      '&:hover': {
                        backgroundColor: selectedRowId === record.id ? '#c0e8b0' : '#fafafa',
                      },
                      transition: 'background-color 0.3s',
                    }}
                  >
                    <TableCell>
                      <Button
                        variant="text"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Open profile for ${record.employee_name}`);
                        }}
                        sx={{ textTransform: 'none', fontWeight: 'bold' }}
                      >
                        {record.employee_name}
                      </Button>
                    </TableCell>
                    <TableCell>{record.department}</TableCell>
                    <TableCell>{record.approval_status}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={(e) => { e.stopPropagation(); alert(`Approve record ${record.id}`); }}>
                        Approve
                      </Button>
                      <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); alert(`Reject record ${record.id}`); }}>
                        Reject
                      </Button>
                    </TableCell>
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