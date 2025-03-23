import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import apiService from '../services/api';

export default function AttendanceImport() {
  const [uploading, setUploading] = useState(false);
  const [importLogs, setImportLogs] = useState<any[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      enqueueSnackbar('No file selected', { variant: 'error' });
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx')) {
      enqueueSnackbar('Please select an XLSX file', { variant: 'error' });
      return;
    }

    setUploading(true);
    try {
      const response = await apiService.upload('/api/attendance/attendance/import_xlsx/', file);
      enqueueSnackbar(
        `Successfully imported ${response.import_log_id} attendance records`,
        { variant: 'success' }
      );
      fetchImportLogs();
    } catch (error: any) {
      console.error('Import failed:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to import attendance records',
        { variant: 'error' }
      );
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const fetchImportLogs = async () => {
    try {
      const response = await apiService.get('/api/attendance/import-logs/');
      setImportLogs(response.results || []);
    } catch (error) {
      console.error('Failed to fetch import logs:', error);
    }
  };

  // Fetch import logs on component mount
  useEffect(() => {
    fetchImportLogs();
  }, []); // Add empty dependency array to run only on mount

  return (
    <Box>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <input
          accept=".xlsx"
          style={{ display: 'none' }}
          id="attendance-file-upload"
          type="file"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <label htmlFor="attendance-file-upload">
          <Button
            variant="contained"
            component="span"
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
          >
            {uploading ? 'Uploading...' : 'Upload XLSX File'}
          </Button>
        </label>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Upload attendance records from Smart PSS Lite XLSX export
        </Typography>
      </Box>

      <Typography variant="h6" gutterBottom>
        Import History
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>File Name</TableCell>
              <TableCell>Import Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Records Imported</TableCell>
              <TableCell>Error Message</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {importLogs.map((log) => (
              <TableRow
                key={log.id}
                sx={{
                  bgcolor: log.success ? 'inherit' : '#fff3e0',
                }}
              >
                <TableCell>{log.filename}</TableCell>
                <TableCell>
                  {new Date(log.import_date).toLocaleString()}
                </TableCell>
                <TableCell>
                  {log.success ? 'Success' : 'Failed'}
                </TableCell>
                <TableCell>{log.records_imported}</TableCell>
                <TableCell>{log.error_message || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
} 