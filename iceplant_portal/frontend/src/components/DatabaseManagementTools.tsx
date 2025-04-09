import React, { useState } from 'react';
import { Box, Button, Typography, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Alert, Paper } from '@mui/material';
import axios from 'axios';

const DatabaseManagementTools: React.FC = () => {
  const [scope, setScope] = useState<string>('sales');
  const [buyersMode, setBuyersMode] = useState<'all' | 'inactive'>('all');
  const [backupConfirmed, setBackupConfirmed] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [doubleConfirmOpen, setDoubleConfirmOpen] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleDeleteClick = () => {
    if (!backupConfirmed) {
      setErrorMessage('Please confirm that a recent backup has been made.');
      return;
    }
    setErrorMessage(null);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    setDoubleConfirmOpen(true);
  };

  const handleDoubleConfirm = async () => {
    setDoubleConfirmOpen(false);
    setLoading(true);
    setResultMessage(null);
    setErrorMessage(null);

    try {
      const response = await axios.delete('/api/company/admin-tools/delete-data/', {
        data: {
          scope,
          backup_confirmed: true,
          buyers_mode: scope === 'buyers' ? buyersMode : undefined,
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token') || ''}`,
        },
      });
      setResultMessage(`Success: Deleted records - ${JSON.stringify(response.data.deleted)}`);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box mt={4} p={2} component={Paper} elevation={3}>
      <Typography variant="h6" gutterBottom>Database Management Tools</Typography>

      {resultMessage && <Alert severity="success">{resultMessage}</Alert>}
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

      <FormControl fullWidth margin="normal">
        <InputLabel id="scope-label">Select Data Scope</InputLabel>
        <Select
          labelId="scope-label"
          value={scope}
          label="Select Data Scope"
          onChange={(e) => setScope(e.target.value as string)}
        >
          <MenuItem value="sales">Sales Data</MenuItem>
          <MenuItem value="buyers">Buyers Data</MenuItem>
          <MenuItem value="attendance">Attendance Data</MenuItem>
          <MenuItem value="inventory">Inventory Data</MenuItem>
          <MenuItem value="expenses">Expenses Data</MenuItem>
          <MenuItem value="maintenance">Maintenance Data</MenuItem>
          <MenuItem value="all">All Data</MenuItem>
        </Select>
      {scope === 'buyers' && (
        <FormControl fullWidth margin="normal">
          <InputLabel id="buyers-mode-label">Buyers Deletion Mode</InputLabel>
          <Select
            labelId="buyers-mode-label"
            value={buyersMode}
            label="Buyers Deletion Mode"
            onChange={(e) => setBuyersMode(e.target.value as 'all' | 'inactive')}
          >
            <MenuItem value="all">Delete All Buyers</MenuItem>
            <MenuItem value="inactive">Delete Only Inactive Buyers</MenuItem>
          </Select>
        </FormControl>
      )}
      </FormControl>

      <FormControlLabel
        control={
          <Checkbox
            checked={backupConfirmed}
            onChange={(e) => setBackupConfirmed(e.target.checked)}
          />
        }
        label="I confirm that a recent backup has been made"
      />

      <Button
        variant="contained"
        color="error"
        onClick={handleDeleteClick}
        disabled={loading}
      >
        Delete Data
      </Button>

      {/* First confirmation dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {scope} data? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirm} color="error">Yes, Continue</Button>
        </DialogActions>
      </Dialog>

      {/* Double confirmation dialog */}
      <Dialog open={doubleConfirmOpen} onClose={() => setDoubleConfirmOpen(false)}>
        <DialogTitle>Final Confirmation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This is your last chance. Deleting {scope} data is irreversible. Do you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDoubleConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDoubleConfirm} color="error">Yes, Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatabaseManagementTools;