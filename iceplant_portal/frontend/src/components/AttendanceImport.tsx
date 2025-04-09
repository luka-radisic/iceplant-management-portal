import React from 'react';
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
  LinearProgress,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import apiService from '../services/api';
import ImportResultDialog from './ImportResultDialog';

export default function AttendanceImport() {
  const uploadButtonRef = React.useRef<HTMLButtonElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importLogs, setImportLogs] = useState<any[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  const [importResult, setImportResult] = useState<any | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      enqueueSnackbar('No file selected', { variant: 'error' });
      return;
    }

    if (!file.name.endsWith('.xlsx')) {
      enqueueSnackbar('Please select an XLSX file', { variant: 'error' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await import('axios').then(({ default: axios }) =>
        axios.post('/api/attendance/attendance/import_xlsx/', formData, {
          baseURL: 'http://127.0.0.1:8000',
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Token ${localStorage.getItem('token') || ''}`,
          },
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent.lengthComputable) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
            }
          },
        })
      );

      enqueueSnackbar(
        `Import request submitted`,
        { variant: 'success' }
      );
      fetchImportLogs();

      let importLogDetails = null;
      try {
        const logResponse = await apiService.get(`/api/attendance/import-logs/${response.data.import_log_id}/`);
        importLogDetails = logResponse;
      } catch (logError) {
        console.error('Failed to fetch import log details:', logError);
      }

      setImportResult({
        success: importLogDetails ? importLogDetails.success : true,
        records_imported: importLogDetails ? importLogDetails.records_imported : 0,
        error_message: importLogDetails ? importLogDetails.error_message : null,
      });
    } catch (error: any) {
      console.error('Import failed:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to import attendance records',
        { variant: 'error' }
      );

      setImportResult({
        success: false,
        records_imported: 0,
        error_message: error.response?.data?.error || error.message || 'Unknown error',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
      setIsResultDialogOpen(true);
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

  useEffect(() => {
    fetchImportLogs();
  }, []);

  return (
    <Box>
      <ImportResultDialog
        open={isResultDialogOpen}
        onClose={() => {
          setIsResultDialogOpen(false);
          setTimeout(() => {
            uploadButtonRef.current?.focus();
          }, 0);
        }}
        importResult={importResult}
      />

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
            ref={uploadButtonRef}
          >
            {uploading ? 'Uploading...' : 'Upload XLSX File'}
          </Button>
        </label>

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Uploading...
            </Typography>
            <Box sx={{ width: '80%', margin: '0 auto' }}>
              <LinearProgress />
            </Box>
          </Box>
        )}

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