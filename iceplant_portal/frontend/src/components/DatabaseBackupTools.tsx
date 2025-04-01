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
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={1}>
          <BackupOutlined fontSize="medium" color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Complete System Backup</Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Creates a full backup of all data in the system, including sales, inventory, expenses, 
          attendance, users, and all other information. Use this for regular system backups.
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          This downloads a JSON file containing all system data that can be used for disaster recovery.
        </Alert>
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleFullBackup}
          disabled={loadingFull || loadingDept || loadingRestore}
          fullWidth
          size="large"
          startIcon={loadingFull ? <CircularProgress size={24} color="inherit" /> : null}
        >
          {loadingFull ? 'Creating Backup...' : 'Download Complete System Backup'}
        </Button>
      </Paper>

      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={1}>
          <RestoreOutlined fontSize="medium" color="error" sx={{ mr: 1 }} />
          <Typography variant="h6">Restore Database</Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Restore the system from a previously created backup file. This will merge the backup data 
          with the existing database.
        </Typography>
        
        <Alert severity="warning" sx={{ mb: 2 }}>
          This operation can potentially modify or overwrite existing data. Use with caution.
        </Alert>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={8}>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<UploadFileOutlined />}
              sx={{ height: '100%' }}
            >
              {selectedFile ? `Selected: ${selectedFile.name}` : 'Select Backup File'}
              <input 
                type="file" 
                hidden 
                accept=".json" 
                onChange={handleFileSelect} 
                ref={fileInputRef}
              />
            </Button>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              color="error"
              onClick={handleRestoreClick}
              disabled={!selectedFile || loadingFull || loadingDept || loadingRestore}
              fullWidth
              startIcon={loadingRestore ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loadingRestore ? 'Restoring...' : 'Restore Database'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={2} sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" mb={1}>
          <BusinessOutlined fontSize="medium" color="secondary" sx={{ mr: 1 }} />
          <Typography variant="h6">Department Backup</Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Creates a focused backup of data for a specific department, including only the records 
          relevant to that department. Useful for migrating department data separately.
        </Typography>

        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} sm={8}>
            <FormControl fullWidth size="small">
              <InputLabel id="dept-select-label">Department</InputLabel>
              <Select
                labelId="dept-select-label"
                value={selectedDept}
                label="Department"
                onChange={(e) => setSelectedDept(e.target.value as string)}
                disabled={loadingFull || loadingDept || loadingRestore}
              >
                <MenuItem value="" disabled>
                  <em>Select Department...</em>
                </MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleDeptBackup}
              disabled={!selectedDept || loadingFull || loadingDept || loadingRestore}
              fullWidth
              startIcon={loadingDept ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loadingDept ? 'Creating...' : 'Download Dept Backup'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Confirmation Dialog */}
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