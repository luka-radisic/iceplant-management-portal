import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import apiService from '../services/api';
import { useSnackbar } from 'notistack';

export default function DatabaseBackupTools() {
  const [loadingFull, setLoadingFull] = useState(false);
  const [loadingDept, setLoadingDept] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
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

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Download database backups as JSON files.
      </Typography>
      
      <Button
        variant="contained"
        color="primary"
        onClick={handleFullBackup}
        disabled={loadingFull || loadingDept}
        fullWidth
        sx={{ mb: 2 }}
      >
        {loadingFull ? <CircularProgress size={24} /> : 'Download Full Backup'}
      </Button>

      <Grid container spacing={1} alignItems="center">
        <Grid item xs={12} sm={8}>
          <FormControl fullWidth size="small">
            <InputLabel id="dept-select-label">Department</InputLabel>
            <Select
              labelId="dept-select-label"
              value={selectedDept}
              label="Department"
              onChange={(e) => setSelectedDept(e.target.value as string)}
              disabled={loadingFull || loadingDept}
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
            disabled={!selectedDept || loadingFull || loadingDept}
            fullWidth
          >
            {loadingDept ? <CircularProgress size={24} /> : 'Download Dept Backup'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
} 