import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import apiService from '../services/api';

interface DepartmentShift {
  department: string;
  shift_start: string;
  shift_end: string;
  break_duration: number;
  is_night_shift: boolean;
  is_rotating_shift: boolean;
  shift_duration: number;
}

export default function DepartmentShiftSettings() {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentShifts, setDepartmentShifts] = useState<DepartmentShift[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  const fetchDepartments = async () => {
    try {
      const response = await apiService.getDepartments();
      // Filter out duplicates and empty departments
      const uniqueDepartments = [...new Set(response.departments || [])]
        .filter(dept => dept && dept.trim() !== '')
        .sort();
      setDepartments(uniqueDepartments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      enqueueSnackbar('Failed to fetch departments', { variant: 'error' });
    }
  };

  const fetchDepartmentShifts = async () => {
    setLoading(true);
    try {
      const shifts: DepartmentShift[] = [];
      for (const department of departments) {
        try {
          const response = await apiService.getDepartmentShift(department);
          shifts.push({
            department,
            shift_start: response.shift_start || '06:00',
            shift_end: response.shift_end || '16:00',
            break_duration: response.break_duration || 2,
            is_night_shift: response.is_night_shift || false,
            is_rotating_shift: response.is_rotating_shift || false,
            shift_duration: response.shift_duration || 8,
          });
        } catch (error) {
          console.error(`Error fetching shift for department ${department}:`, error);
        }
      }
      setDepartmentShifts(shifts);
    } catch (error) {
      console.error('Error fetching department shifts:', error);
      enqueueSnackbar('Failed to fetch department shifts', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (departments.length > 0) {
      fetchDepartmentShifts();
    }
  }, [departments]);

  const handleShiftChange = (department: string, field: keyof DepartmentShift, value: any) => {
    setDepartmentShifts(prev =>
      prev.map(shift =>
        shift.department === department
          ? { ...shift, [field]: value }
          : shift
      )
    );
  };

  const handleSave = async (department: string) => {
    try {
      const shift = departmentShifts.find(s => s.department === department);
      if (!shift) return;

      await apiService.updateDepartmentShift(department, shift);
      enqueueSnackbar(`Shift settings saved for ${department}`, { variant: 'success' });

      // Refresh the data after saving
      await fetchDepartmentShifts();
    } catch (error) {
      console.error('Error saving department shift:', error);
      enqueueSnackbar('Failed to save shift settings', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Department Shift Settings
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Department</TableCell>
              <TableCell>Shift Start</TableCell>
              <TableCell>Shift End</TableCell>
              <TableCell>Break Duration (hrs)</TableCell>
              <TableCell>Night Shift</TableCell>
              <TableCell>Rotating Shift</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {departmentShifts.map((shift) => (
              <TableRow key={shift.department}>
                <TableCell>{shift.department}</TableCell>
                <TableCell>
                  <TextField
                    type="time"
                    value={shift.shift_start}
                    onChange={(e) => handleShiftChange(shift.department, 'shift_start', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="time"
                    value={shift.shift_end}
                    onChange={(e) => handleShiftChange(shift.department, 'shift_end', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={shift.break_duration}
                    onChange={(e) => handleShiftChange(shift.department, 'break_duration', Number(e.target.value))}
                    InputProps={{ inputProps: { min: 0, max: 24 } }}
                    size="small"
                    sx={{ width: '80px' }}
                  />
                </TableCell>
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={shift.is_night_shift}
                        onChange={(e) => handleShiftChange(shift.department, 'is_night_shift', e.target.checked)}
                        size="small"
                      />
                    }
                    label=""
                  />
                </TableCell>
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={shift.is_rotating_shift}
                        onChange={(e) => {
                          handleShiftChange(shift.department, 'is_rotating_shift', e.target.checked);
                          if (e.target.checked) {
                            handleShiftChange(shift.department, 'shift_duration', 12);
                          } else {
                            handleShiftChange(shift.department, 'shift_duration', 8);
                          }
                        }}
                        size="small"
                      />
                    }
                    label=""
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleSave(shift.department)}
                  >
                    Save
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
} 