import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Alert,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Card,
  CardHeader,
  CardContent
} from '@mui/material';
import { BackupOutlined, BusinessOutlined, RestoreOutlined, UploadFileOutlined } from '@mui/icons-material';
import apiService from '../services/api';
import { useSnackbar } from 'notistack';

export default function DatabaseBackupTools() {
  const [loadingFull, setLoadingFull] = useState(false);
  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar } = useSnackbar();

  // Fetch departments on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await apiService.getDepartments(); // Assuming this exists and works
        setDepartments(response.departments || []);
      } catch (error) {
        console.error('Error fetching departments for backup:', error);
        enqueueSnackbar('Could not load departments.', { variant: 'error' });
      }
    };
    fetchDepartments();
  }, [enqueueSnackbar]);

  const handleFullBackup = async () => {
    setLoadingFull(true);
    try {
      await apiService.backupFullDatabase(); // We will add this to apiService
      // File download is handled by the browser via Content-Disposition
      enqueueSnackbar('Full database backup download started.', { variant: 'success' });
    } catch (error) {
      console.error('Error starting full database backup:', error);
      enqueueSnackbar('Failed to start full database backup. Check console.', { variant: 'error' });
    } finally {
      setLoadingFull(false);
    }
  };

  const handleDeptBackup = async () => {
    if (!selectedDept) {
      enqueueSnackbar('Please select a department.', { variant: 'warning' });
      return;
    }
    setLoadingDept(true);
    try {
      await apiService.backupDepartmentDatabase(selectedDept); // We will add this to apiService
      // File download is handled by the browser
      enqueueSnackbar(`Department backup download started for ${selectedDept}.`, { variant: 'success' });
    } catch (error) {
      console.error(`Error starting department database backup for ${selectedDept}:`, error);
      enqueueSnackbar('Failed to start department backup. Check console.', { variant: 'error' });
    } finally {
      setLoadingDept(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (!file.name.endsWith('.json')) {
        enqueueSnackbar('Please select a JSON backup file.', { variant: 'error' });
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRestoreClick = () => {
    if (!selectedFile) {
      enqueueSnackbar('Please select a backup file first.', { variant: 'warning' });
      return;
    }
    // Open confirmation dialog
    setConfirmDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    setConfirmDialogOpen(false);
    if (!selectedFile) return;
    
    setLoadingRestore(true);
    try {
      await apiService.restoreDatabase(selectedFile);
      enqueueSnackbar('Database restored successfully!', { variant: 'success' });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error restoring database:', error);
      const errorMsg = error.response?.data?.error || 'Failed to restore database. Check console for details.';
      enqueueSnackbar(errorMsg, { variant: 'error' });
    } finally {
      setLoadingRestore(false);
    }
  };

  return (
    <Box>
      <Grid container spacing={3} alignItems="stretch">

        <Grid item xs={12} md={4}>
          <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <CardHeader
              avatar={<BackupOutlined color="primary" />}
              title="Complete System Backup"
            />
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Creates a full backup of all data (sales, inventory, attendance, etc.). Use for regular system backups.
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Downloads a JSON file usable for disaster recovery.
              </Alert>
            </CardContent>
            <Box sx={{ p: 2, pt: 0 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleFullBackup}
                disabled={loadingFull || loadingDept || loadingRestore}
                fullWidth
                size="large"
                startIcon={loadingFull ? <CircularProgress size={24} color="inherit" /> : null}
              >
                {loadingFull ? 'Creating Backup...' : 'Download Full Backup'}
              </Button>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <CardHeader
              avatar={<RestoreOutlined color="error" />}
              title="Restore Database"
            />
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Restore the system from a selected backup file. Merges backup data with the existing database.
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Caution: This operation can modify or overwrite existing data.
              </Alert>
              <Grid container spacing={1} alignItems="stretch">
                <Grid item xs={12} sm={7}>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    startIcon={<UploadFileOutlined />}
                    sx={{ height: '100%', textTransform: 'none' }}
                  >
                    {selectedFile ? `Selected: ${selectedFile.name}` : 'Select File (.json)'}
                    <input type="file" hidden accept=".json" onChange={handleFileSelect} ref={fileInputRef} />
                  </Button>
                </Grid>
                <Grid item xs={12} sm={5}>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleRestoreClick}
                    disabled={!selectedFile || loadingFull || loadingDept || loadingRestore}
                    fullWidth
                    sx={{ height: '100%' }}
                    startIcon={loadingRestore ? <CircularProgress size={18} color="inherit" /> : null}
                  >
                    {loadingRestore ? 'Restoring...' : 'Restore'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <CardHeader
              avatar={<BusinessOutlined color="secondary" />}
              title="Department Backup"
            />
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Creates a focused backup for a specific department. Useful for migrating department data separately.
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel id="dept-select-label">Department</InputLabel>
                <Select
                  labelId="dept-select-label"
                  value={selectedDept}
                  label="Department"
                  onChange={(e) => setSelectedDept(e.target.value as string)}
                  disabled={loadingFull || loadingDept || loadingRestore}
                >
                  <MenuItem value="" disabled><em>Select Department...</em></MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
            <Box sx={{ p: 2, pt: 0 }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleDeptBackup}
                disabled={!selectedDept || loadingFull || loadingDept || loadingRestore}
                fullWidth
                startIcon={loadingDept ? <CircularProgress size={18} color="inherit" /> : null}
              >
                {loadingDept ? 'Creating...' : 'Download Dept Backup'}
              </Button>
            </Box>
          </Card>
        </Grid>

      </Grid>

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirm Database Restore</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to restore the database from the selected backup file?
            This action will modify your current database and cannot be easily undone.
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2 }}>
            It is strongly recommended to create a backup of your current data before proceeding.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRestoreConfirm} variant="contained" color="error">
            Yes, Restore Database
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 