import { Delete as DeleteIcon, PhotoCamera, Settings as SettingsIcon, Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, Note as NoteIcon, Close as CloseIcon } from '@mui/icons-material';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
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
import { addHours, format, parse, differenceInMinutes } from 'date-fns';
import { format as formatTZ } from 'date-fns-tz';
import { useSnackbar } from 'notistack';
import { useEffect, useState, useMemo } from 'react';
import apiService from '../services/api';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { formatDuration } from '../utils/formatters';
import { debounce } from 'lodash';

// Shift configuration type
interface ShiftConfig {
  shift_start: string;
  shift_end: string;
  break_duration: number;
  is_night_shift: boolean;
  is_rotating_shift: boolean;
  shift_duration: number;
  rotation_partner_id?: string;
}

interface EmployeeAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  isHrUser: boolean;
}

export default function EmployeeAttendanceModal({ open, onClose, employeeId, employeeName, isHrUser }: EmployeeAttendanceModalProps) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [showShiftConfig, setShowShiftConfig] = useState(false);
  const [trackShifts, setTrackShifts] = useState(false);
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig>({
    shift_start: '06:00',
    shift_end: '16:00',
    break_duration: 2,
    is_night_shift: false,
    is_rotating_shift: false,
    shift_duration: 8,
  });
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    noShows: 0,
    lateArrivals: 0,
    missingCheckouts: 0,
    morningShifts: 0,
    nightShifts: 0,
    dayRotatingShifts: 0,
    nightRotatingShifts: 0,
    avgCheckIn: '',
    avgCheckOut: '',
  });
  const [filters, setFilters] = useState(() => {
    const today = new Date();
    const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return {
      start_date: firstDayCurrentMonth.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0],
      status: 'all',
    };
  });
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // State for inline editing HR notes
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [editingNote, setEditingNote] = useState<string>('');
  const [savingNote, setSavingNote] = useState<boolean>(false);

  const [profileError, setProfileError] = useState<string | null>(null);

  const [profileCache, setProfileCache] = useState<Record<string, any>>({});
  const [shiftCache, setShiftCache] = useState<Record<string, any>>({});

  // Function to set quick date filters
  const setQuickDateFilter = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months + 1);
    start.setDate(1); // First day of the month

    setFilters(prev => ({
      ...prev,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    }));
    setPage(0);
  };

  // Function to clear date filters
  const clearDateFilters = () => {
    setFilters(prev => ({
      ...prev,
      start_date: '',
      end_date: '',
    }));
    setPage(0);
  };

  // Function to fetch employee's shift configuration
  const fetchEmployeeShift = async () => {
    if (shiftCache[employeeId]) {
      setShiftConfig(shiftCache[employeeId]);
      return;
    }
    try {
      const response = await apiService.get(`/api/attendance/employee-shift/${employeeId}/`);
      if (response) {
        setShiftConfig(response);
        setShiftCache(prev => ({ ...prev, [employeeId]: response }));
      }
    } catch (error) {
      console.error('Error fetching employee shift:', error);
    }
  };

  // Function to save employee's shift configuration
  const saveEmployeeShift = async () => {
    try {
      await apiService.put(`/api/attendance/employee-shift/${employeeId}/`, shiftConfig);
      enqueueSnackbar('Shift configuration saved successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error saving employee shift:', error);
      enqueueSnackbar('Failed to save shift configuration', { variant: 'error' });
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatTZ(date, 'HH:mm', { timeZone: 'Asia/Manila' });
    } catch {
      return '-';
    }
  };

  const formatDateStr = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatTZ(date, 'MMM dd, yyyy', { timeZone: 'Asia/Manila' });
    } catch {
      return '-';
    }
  };

  const getWeekday = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const weekday = formatTZ(date, 'EEEE', { timeZone: 'Asia/Manila' });
      const isSunday = weekday === 'Sunday';
      return { weekday, isSunday };
    } catch {
      return { weekday: '-', isSunday: false };
    }
  };

  const getShiftType = (checkInTime: Date, checkOutTime: Date | null): string => {
    const timeStr = formatTZ(checkInTime, 'HH:mm', { timeZone: 'Asia/Manila' });
    const manilaDate = new Date(formatTZ(checkInTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Asia/Manila' }));
    const shiftStartTime = parse(shiftConfig.shift_start, 'HH:mm', manilaDate);

    if (checkOutTime) {
      const checkInHour = checkInTime.getHours();
      const duration = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      if (duration >= 8) {
        if (shiftConfig.is_rotating_shift && shiftConfig.shift_duration >= 12 && duration >= 10) {
          if (checkInHour >= 5 && checkInHour <= 9) {
            return '12-Hour Day Shift';
          } else if (checkInHour >= 17 && checkInHour <= 21) {
            return '12-Hour Night Shift';
          }
        } else if (shiftConfig.is_night_shift || (checkInHour >= 18 || checkInHour <= 6)) {
          return 'Night Shift';
        } else {
          return 'Morning Shift';
        }
      }
    }

    if (shiftConfig.is_rotating_shift && shiftConfig.shift_duration >= 12) {
      const isMorningShift = (timeStr >= '06:00' && timeStr < '18:00');
      const isNightShift = (timeStr >= '18:00' && timeStr <= '23:59') || (timeStr >= '00:00' && timeStr < '06:00');
      if (isMorningShift) return '12-Hour Day Shift';
      if (isNightShift) return '12-Hour Night Shift';
    } else if (shiftConfig.is_night_shift) {
      const isInNightShift = (timeStr >= shiftConfig.shift_start && timeStr <= '23:59') || (timeStr >= '00:00' && timeStr <= shiftConfig.shift_end);
      if (isInNightShift) return 'Night Shift';
    } else {
      if (timeStr >= shiftConfig.shift_start && timeStr <= shiftConfig.shift_end) return 'Morning Shift';
    }

    return 'Outside Shift Hours';
  };

  const isLateForShift = (checkInTime: Date): boolean => {
    const manilaDate = new Date(formatTZ(checkInTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Asia/Manila' }));
    const shiftStartTime = parse(shiftConfig.shift_start, 'HH:mm', manilaDate);
    const graceEndTime = addHours(shiftStartTime, 1);
    return checkInTime > graceEndTime;
  };

  const fetchEmployeeRecords = async () => {
    setLoading(true);
    try {
      interface FilterParams {
        employee_id: string;
        page_size: number;
        page: number;
        start_date?: string;
        end_date?: string;
        status?: string;
      }

      const filterParams: FilterParams = {
        employee_id: employeeId,
        page_size: rowsPerPage,
        page: page + 1,
      };

      if (filters.start_date) {
        filterParams.start_date = filters.start_date;
      }
      if (filters.end_date) {
        filterParams.end_date = filters.end_date;
      }
      if (filters.status !== 'all') {
        filterParams.status = filters.status;
      }

      const response = await apiService.get('/api/attendance/attendance/', filterParams);

      if (!response || !response.results) {
        setRecords([]);
        setTotalCount(0);
        return;
      }

      const allRecords = response.results || [];
      const totalRecords = response.count || 0;

      const recordsWithShifts = allRecords.map((record: any) => ({
        ...record,
        checkInTime: new Date(record.check_in),
        checkOutTime: record.check_out ? new Date(record.check_out) : null,
        shiftType: getShiftType(new Date(record.check_in), record.check_out ? new Date(record.check_out) : null),
      }));

      const presentRecords = allRecords.filter((r: any) => r.department !== 'NO SHOW');
      const noShows = allRecords.filter((r: any) => r.department === 'NO SHOW');
      const morningShifts = recordsWithShifts.filter((r: any) => r.shiftType === 'Morning Shift');
      const nightShifts = recordsWithShifts.filter((r: any) => r.shiftType === 'Night Shift');
      const dayRotatingShifts = recordsWithShifts.filter((r: any) => r.shiftType === '12-Hour Day Shift');
      const nightRotatingShifts = recordsWithShifts.filter((r: any) => r.shiftType === '12-Hour Night Shift');
      const lateArrivals = recordsWithShifts.filter((r: any) => isLateForShift(r.checkInTime));
      const missingCheckouts = presentRecords.filter((r: any) => !r.check_out);

      const checkInTimes = presentRecords.map((r: any) => new Date(r.check_in)).filter(Boolean);
      const checkOutTimes = presentRecords.map((r: any) => r.check_out && new Date(r.check_out)).filter(Boolean);

      const avgCheckIn = checkInTimes.length
        ? format(new Date(checkInTimes.reduce((acc: any, time: any) => acc + time.getTime(), 0) / checkInTimes.length), 'HH:mm')
        : '-';

      const avgCheckOut = checkOutTimes.length
        ? format(new Date(checkOutTimes.reduce((acc: any, time: any) => acc + time.getTime(), 0) / checkOutTimes.length), 'HH:mm')
        : '-';

      setStats({
        totalDays: totalRecords,
        presentDays: presentRecords.length,
        noShows: noShows.length,
        lateArrivals: lateArrivals.length,
        missingCheckouts: missingCheckouts.length,
        morningShifts: morningShifts.length,
        nightShifts: nightShifts.length,
        dayRotatingShifts: dayRotatingShifts.length,
        nightRotatingShifts: nightRotatingShifts.length,
        avgCheckIn,
        avgCheckOut,
      });

      setTotalCount(totalRecords);
      setRecords(recordsWithShifts);
    } catch (error) {
      console.error('Error fetching employee records:', error);
      if (error instanceof Error && (error as any).response?.status === 404) {
        setRecords([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeProfile = async () => {
    if (profileCache[employeeId]) {
      const cached = profileCache[employeeId];
      setTrackShifts(cached.track_shifts || false);
      setProfilePicture(cached.photo_url || null);
      return;
    }
    setProfileError(null);
    try {
      const timestamp = new Date().getTime();
      const response = await apiService.get(`/api/attendance/employee-profile/${employeeId}/`);
      if (response) {
        setTrackShifts(response.track_shifts || false);
        if (response.photo_url) {
          const photoUrl = response.photo_url.includes('?')
            ? `${response.photo_url}&t=${timestamp}`
            : `${response.photo_url}?t=${timestamp}`;
          setProfilePicture(photoUrl);
          response.photo_url = photoUrl;
        } else {
          setProfilePicture(null);
        }
        setProfileCache(prev => ({ ...prev, [employeeId]: response }));
      }
    } catch (error: any) {
      setProfilePicture(null);
      setTrackShifts(false);
      if (error.response?.status === 404) {
        setProfileError('No profile found. Basic attendance tracking enabled.');
      } else {
        setProfileError('Error loading profile. Using basic attendance tracking.');
      }
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      enqueueSnackbar('No file selected', { variant: 'error' });
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      enqueueSnackbar('Invalid file type. Only JPEG, PNG and GIF are allowed.', { variant: 'error' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      enqueueSnackbar('File too large. Maximum size is 5MB.', { variant: 'error' });
      return;
    }

    setUploadingPhoto(true);
    try {
      const response = await apiService.uploadEmployeePhoto(employeeId, file);
      if (response && response.photo_url) {
        const timestamp = new Date().getTime();
        const photoUrl = response.photo_url.includes('?')
          ? `${response.photo_url}&t=${timestamp}`
          : `${response.photo_url}?t=${timestamp}`;
        setProfilePicture(photoUrl);
        enqueueSnackbar('Profile picture updated successfully', { variant: 'success' });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      const errorMessage =
        error instanceof Error && (error as any).response?.data?.error
          ? (error as any).response.data.error
          : error instanceof Error && error.message
            ? error.message
            : 'Failed to upload profile picture';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      setProfilePicture(null);
    } finally {
      setUploadingPhoto(false);
      event.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!profilePicture) return;

    setUploadingPhoto(true);
    try {
      await apiService.removeEmployeePhoto(employeeId);
      setProfilePicture(null);
      enqueueSnackbar('Profile picture removed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error removing profile picture:', error);
      enqueueSnackbar('Failed to remove profile picture', { variant: 'error' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleShiftTrackingToggle = async () => {
    try {
      const currentProfile = await apiService.get(`/api/attendance/employee-profile/${employeeId}/`);
      const response = await apiService.updateEmployeeProfile(employeeId, {
        employee_id: employeeId,
        full_name: currentProfile.full_name,
        department: currentProfile.department,
        position: currentProfile.position || '',
        date_joined: currentProfile.date_joined,
        is_active: currentProfile.is_active,
        track_shifts: !trackShifts,
      });
      setTrackShifts(response.track_shifts);
      if (response.track_shifts) {
        await saveEmployeeShift();
      }
      fetchEmployeeRecords();
    } catch (error) {
      console.error('Error updating shift tracking:', error);
      enqueueSnackbar('Failed to update shift tracking', { variant: 'error' });
    }
  };

  const handleEditNoteClick = (record: any) => {
    setEditingRecordId(record.id);
    setEditingNote(record.hr_notes || '');
  };

  const handleCancelEditNote = () => {
    setEditingRecordId(null);
    setEditingNote('');
  };

  const handleSaveNoteClick = async () => {
    if (editingRecordId === null) return;
    setSavingNote(true);
    try {
      const payload = { hr_notes: editingNote };
      await apiService.patch(`/api/attendance/attendance/${editingRecordId}/`, payload);
      setRecords(prevRecords =>
        prevRecords.map(rec =>
          rec.id === editingRecordId ? { ...rec, hr_notes: editingNote } : rec
        )
      );
      enqueueSnackbar('HR Note saved successfully', { variant: 'success' });
      handleCancelEditNote();
    } catch (error) {
      console.error('Error saving HR note:', error);
      enqueueSnackbar('Failed to save HR note', { variant: 'error' });
    } finally {
      setSavingNote(false);
    }
  };

  const getStatusChip = (record: any) => {
    const { isSunday } = getWeekday(record.check_in);

    return (
      <Box display="flex" gap={1}>
        {isSunday && (
          <Chip label="Off Day" color="info" size="small" variant="outlined" />
        )}
        {record.department === 'NO SHOW' && (
          <Chip label="No Show" color="error" size="small" variant="outlined" />
        )}
        {!record.check_out && record.department !== 'NO SHOW' && (
          <Chip label="Missing Check-Out" color="warning" size="small" variant="outlined" />
        )}
        {record.check_in && record.check_out && !isSunday && record.department !== 'NO SHOW' && (
          <Chip label="Complete" color="success" size="small" variant="outlined" />
        )}
      </Box>
    );
  };

  const handleFilterDateChange = (filterName: 'start_date' | 'end_date', newValue: Date | null) => {
    let formattedValue = '';
    if (newValue) {
      try {
        formattedValue = format(newValue, 'yyyy-MM-dd');
      } catch {
        console.error('Error formatting date');
      }
    }
    setFilters(prev => ({
      ...prev,
      [filterName]: formattedValue,
    }));
  };

  const handleFilterStatusChange = (newValue: string) => {
    setFilters(prev => ({
      ...prev,
      status: newValue,
    }));
  };

  const handleExportHrNotes = () => {
    if (!isHrUser) return;

    try {
      const notesData = records
        .filter((record: any) => record.hr_notes)
        .map((record: any) => ({
          date: formatDateStr(record.check_in),
          weekday: getWeekday(record.check_in).weekday,
          status: record.department === 'NO SHOW' ? 'No Show' : (record.check_out ? 'Present' : 'Missing Check-out'),
          note: record.hr_notes
        }));

      const csvContent = [
        ['Employee Name:', employeeName],
        ['Employee ID:', employeeId],
        ['Export Date:', new Date().toLocaleDateString()],
        [''],
        ['Date', 'Day', 'Status', 'HR Note']
      ];

      notesData.forEach(({ date, weekday, status, note }) => {
        csvContent.push([date, weekday, status, note]);
      });

      const csv = csvContent.map(row => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hr_notes_${employeeId}_${format(new Date(), 'yyyyMMdd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      enqueueSnackbar('HR Notes exported successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error exporting HR notes:', error);
      enqueueSnackbar('Failed to export HR notes', { variant: 'error' });
    }
  };

  const debouncedFetchEmployeeRecords = useMemo(() =>
    debounce(fetchEmployeeRecords, 300), [employeeId, filters, page, rowsPerPage]);

  useEffect(() => {
    if (open && employeeId) {
      fetchEmployeeProfile();
      fetchEmployeeShift();
      fetchEmployeeRecords();
    }
  }, [open, employeeId]);

  useEffect(() => {
    if (open && employeeId) {
      debouncedFetchEmployeeRecords();
    }
  }, [filters, page, rowsPerPage, open, employeeId, debouncedFetchEmployeeRecords]);

  useEffect(() => {
    return () => {
      debouncedFetchEmployeeRecords.cancel();
    };
  }, [debouncedFetchEmployeeRecords]);

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
            <FormControlLabel
              control={
                <Switch
                  checked={shiftConfig.is_rotating_shift}
                  onChange={(e) => setShiftConfig(prev => ({ ...prev, is_rotating_shift: e.target.checked }))}
                />
              }
              label="Rotating Shift"
            />
            <TextField
              label="Shift Duration (hours)"
              type="number"
              value={shiftConfig.shift_duration}
              onChange={(e) => setShiftConfig(prev => ({ ...prev, shift_duration: Number(e.target.value) }))}
              fullWidth
              margin="dense"
              InputProps={{ inputProps: { min: 0, max: 24 } }}
            />
            {shiftConfig.is_rotating_shift && (
              <TextField
                label="Rotation Partner ID"
                type="text"
                value={shiftConfig.rotation_partner_id || ''}
                onChange={(e) => setShiftConfig(prev => ({ ...prev, rotation_partner_id: e.target.value }))}
                fullWidth
                margin="dense"
              />
            )}
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ mr: 2, position: 'relative' }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  uploadingPhoto ? (
                    <CircularProgress size={32} />
                  ) : (
                    <Box>
                      <input
                        accept="image/*"
                        type="file"
                        id={`profile-picture-upload-${employeeId}`}
                        style={{ display: 'none' }}
                        onChange={handleProfilePictureUpload}
                        disabled={uploadingPhoto}
                      />
                      <label htmlFor={`profile-picture-upload-${employeeId}`}>
                        <IconButton
                          component="span"
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            width: 32,
                            height: 32,
                            '&:hover': {
                              bgcolor: 'primary.dark',
                            },
                          }}
                          disabled={uploadingPhoto}
                        >
                          <PhotoCamera sx={{ fontSize: 16 }} />
                        </IconButton>
                      </label>
                    </Box>
                  )
                }
              >
                <Avatar
                  src={profilePicture || undefined}
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'primary.main',
                    fontSize: '2rem',
                  }}
                  imgProps={{
                    onError: (e) => {
                      console.error('Error loading profile image, falling back to initials');
                      setProfilePicture(null);
                      (e.target as HTMLImageElement).onerror = null;
                    }
                  }}
                >
                  {employeeName.split(' ').map(n => n[0]).join('')}
                </Avatar>
              </Badge>
              {profilePicture && (
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'error.dark',
                    },
                    zIndex: 1,
                  }}
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
            <Box>
              <Typography component="div" variant="h6">
                {employeeName}
              </Typography>
              <Typography component="div" variant="body2" color="textSecondary">
                Employee ID: {employeeId}
              </Typography>
              {trackShifts && (
                <Typography
                  component="div"
                  variant="body2"
                  sx={{
                    mt: 0.5,
                    color: shiftConfig.is_rotating_shift && shiftConfig.shift_duration >= 12 ? 'primary.main' : 'text.secondary',
                    fontWeight: shiftConfig.is_rotating_shift && shiftConfig.shift_duration >= 12 ? 'bold' : 'normal'
                  }}
                >
                  {shiftConfig.is_rotating_shift && shiftConfig.shift_duration >= 12
                    ? `12-Hour Rotating Shift`
                    : shiftConfig.is_night_shift
                      ? 'Night Shift Worker'
                      : 'Day Shift Worker'}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={trackShifts}
                  onChange={handleShiftTrackingToggle}
                />
              }
              label="Track Shifts"
            />
            {trackShifts && (
              <Tooltip title="Configure Shifts">
                <IconButton onClick={() => setShowShiftConfig(true)}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            )}
            <IconButton onClick={onClose} size="small" sx={{ ml: 1 }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DialogContent dividers>
          {isHrUser && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<NoteIcon />}
                onClick={handleExportHrNotes}
                size="small"
              >
                Export HR Notes
              </Button>
            </Box>
          )}

          <Box mb={3}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography component="div" variant="h6" gutterBottom>
                  Attendance Statistics for Selected Period
                </Typography>
              </Grid>
              {trackShifts && (
                <>
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
                  {(stats.dayRotatingShifts > 0 || stats.nightRotatingShifts > 0) && (
                    <>
                      <Grid item xs={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography component="div" variant="body2" color="textSecondary">
                            12h Day Shifts
                          </Typography>
                          <Typography component="div" variant="h6">
                            {stats.dayRotatingShifts}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography component="div" variant="body2" color="textSecondary">
                            12h Night Shifts
                          </Typography>
                          <Typography component="div" variant="h6">
                            {stats.nightRotatingShifts}
                          </Typography>
                        </Paper>
                      </Grid>
                    </>
                  )}
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
                </>
              )}
            </Grid>
          </Box>

          <Box mt={3}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Quick Date Filters:
            </Typography>
            <Grid container spacing={1} mb={2}>
              <Grid item>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setQuickDateFilter(1)}
                >
                  This Month
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setQuickDateFilter(3)}
                >
                  Last 3 Months
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setQuickDateFilter(6)}
                >
                  Last 6 Months
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={clearDateFilters}
                >
                  All Time
                </Button>
              </Grid>
            </Grid>

            <Grid container spacing={2} mb={2}>
              <Grid item xs={3}>
                <DatePicker
                  label="Start Date"
                  value={filters.start_date ? new Date(filters.start_date + 'T00:00:00') : null}
                  onChange={(newValue) => handleFilterDateChange('start_date', newValue)}
                  slotProps={{ textField: { fullWidth: true, InputLabelProps: { shrink: true } } }}
                  format="yyyy-MM-dd"
                />
              </Grid>
              <Grid item xs={3}>
                <DatePicker
                  label="End Date"
                  value={filters.end_date ? new Date(filters.end_date + 'T00:00:00') : null}
                  onChange={(newValue) => handleFilterDateChange('end_date', newValue)}
                  slotProps={{ textField: { fullWidth: true, InputLabelProps: { shrink: true } } }}
                  format="yyyy-MM-dd"
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  select
                  label="Status"
                  value={filters.status}
                  onChange={(e) => handleFilterStatusChange(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="present">Present</MenuItem>
                  <MenuItem value="absent">Absent</MenuItem>
                </TextField>
              </Grid>
            </Grid>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Day</TableCell>
                      <TableCell>Check In</TableCell>
                      <TableCell>Check Out</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Shift Type</TableCell>
                      <TableCell>Status</TableCell>
                      {isHrUser && (
                        <TableCell sx={{ minWidth: 250 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            HR Notes
                            <Tooltip title="Add notes for important events, disciplinary actions, or special circumstances">
                              <NoteIcon fontSize="small" color="action" />
                            </Tooltip>
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.map((record: any) => {
                      const { weekday, isSunday } = getWeekday(record.check_in);
                      const isNoShow = record.department === 'NO SHOW';
                      const isMissingCheckout = !isNoShow && !record.check_out;
                      const isEditing = record.id === editingRecordId;
                      return (
                        <TableRow
                          key={record.id}
                          hover
                          sx={{
                            bgcolor: isSunday
                              ? 'info.lighter'
                              : isNoShow
                                ? 'error.lighter'
                                : isMissingCheckout
                                  ? 'warning.lighter'
                                  : 'inherit',
                            '& td': {
                              borderBottom: record.hr_notes ? '2px solid' : 'inherit',
                              borderBottomColor: record.hr_notes ? 'error.light' : 'inherit'
                            }
                          }}
                        >
                          <TableCell>{formatDateStr(record.check_in)}</TableCell>
                          <TableCell sx={{
                            color: isSunday ? 'info.dark' : 'inherit',
                            fontWeight: isSunday ? 'bold' : 'inherit'
                          }}>
                            {weekday}
                          </TableCell>
                          <TableCell>{formatTime(record.check_in)}</TableCell>
                          <TableCell>{record.check_out ? formatTime(record.check_out) : '-'}</TableCell>
                          <TableCell>{record.duration || '-'}</TableCell>
                          <TableCell>{record.shiftType}</TableCell>
                          <TableCell>{getStatusChip(record)}</TableCell>
                          {isHrUser && (
                            <TableCell
                              sx={{
                                whiteSpace: 'pre-wrap',
                                maxWidth: 250,
                                overflowWrap: 'break-word',
                                verticalAlign: 'top'
                              }}
                            >
                              {isEditing ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                  <TextField
                                    multiline
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    value={editingNote}
                                    onChange={(e) => setEditingNote(e.target.value)}
                                    disabled={savingNote}
                                    autoFocus
                                    sx={{ mb: 1 }}
                                  />
                                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <IconButton size="small" onClick={handleCancelEditNote} disabled={savingNote} title="Cancel">
                                      <CancelIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={handleSaveNoteClick} disabled={savingNote} title="Save">
                                      {savingNote ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" color="primary" />}
                                    </IconButton>
                                  </Box>
                                </Box>
                              ) : (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  {record.hr_notes ? (
                                    <Chip
                                      icon={<NoteIcon fontSize="small" />}
                                      label={record.hr_notes}
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      sx={{ fontWeight: 600 }}
                                    />
                                  ) : (
                                    '-'
                                  )}
                                  <IconButton size="small" onClick={() => handleEditNoteClick(record)} title="Edit Note" sx={{ ml: 1, mt: -0.5 }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </Box>
        </DialogContent>
      </LocalizationProvider>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
      {trackShifts && <ShiftConfigDialog />}
    </Dialog>
  );
}