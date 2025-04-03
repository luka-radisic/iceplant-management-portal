import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Divider,
} from '@mui/material';
import { MaintenanceRecord } from '../types/api'; // Assuming types are in ../types/api
import { formatDate, formatCurrency, formatDuration } from '../utils/formatters';

const MaintenancePrintPage: React.FC = () => {
  // State to hold an array of records
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let parsedData: MaintenanceRecord[] = [];
    let dataFound = false;

    // Try retrieving multiple selected records first
    const storedMultipleData = localStorage.getItem('printSelectedMaintenanceRecords');
    if (storedMultipleData) {
      try {
        parsedData = JSON.parse(storedMultipleData) as MaintenanceRecord[];
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          dataFound = true;
          console.log(`[PrintPage] Loaded ${parsedData.length} selected records from localStorage.`);
          // Optional: Clear item after loading
          // localStorage.removeItem('printSelectedMaintenanceRecords');
        } else {
           console.warn("[PrintPage] 'printSelectedMaintenanceRecords' data is not a valid array or is empty.");
        }
      } catch (error) {
        console.error("Error parsing selected maintenance records from localStorage:", error);
        setErrorMsg("Error loading selected records data.");
      }
    }

    // If no selected records found, try the single record key (fallback)
    if (!dataFound) {
      const storedSingleData = localStorage.getItem('printMaintenanceRecord');
      if (storedSingleData) {
        try {
          const singleRecord = JSON.parse(storedSingleData) as MaintenanceRecord;
          parsedData = [singleRecord]; // Wrap single record in an array
          dataFound = true;
          console.log(`[PrintPage] Loaded single record from localStorage.`);
           // Optional: Clear item after loading
          // localStorage.removeItem('printMaintenanceRecord');
        } catch (error) {
          console.error("Error parsing single maintenance record from localStorage:", error);
           setErrorMsg("Error loading record data.");
        }
      }
    }

    if (dataFound) {
        setRecords(parsedData);
        // Trigger print dialog automatically after a short delay
        const timer = setTimeout(() => {
            window.print();
        }, 500); // Adjust delay as needed

        return () => clearTimeout(timer);
    } else {
        console.error("[PrintPage] No maintenance record data found in localStorage for printing.");
        setErrorMsg("Maintenance Record data not found for printing.");
    }

  }, []); // Empty dependency array ensures this runs only once on mount

  if (errorMsg) {
     return (
      <Container>
        <Typography variant="h6" color="error" align="center" sx={{ mt: 4 }}>
          Error: {errorMsg}
        </Typography>
      </Container>
    );
  }

  if (records.length === 0) {
    return (
      <Container>
        <Typography variant="h6" align="center" sx={{ mt: 4 }}>
          Loading records...
        </Typography>
      </Container>
    );
  }

  // Print layout for multiple records
  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 2 }}>
      {/* Add styles for printing - page breaks */}
      <style>
        {`
          @media print {
            .print-page-break {
              page-break-after: always;
              margin-top: 20px; /* Add space before the next record */
            }
            body { -webkit-print-color-adjust: exact; } /* Ensure colors print */
          }
        `}
      </style>
      {records.map((record, index) => (
        <Paper
           key={record.id || index} // Use record ID if available, otherwise index
           elevation={0} // Remove shadow for printing
           sx={{
             p: 2,
             border: '1px solid #eee', // Optional border for separation
             // Add margin bottom except for the last item
             mb: index < records.length - 1 ? 4 : 0,
             // Apply page break class except for the last item
             ...(index < records.length - 1 && { className: 'print-page-break' })
           }}
         >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h1">
              Maintenance Record {records.length > 1 ? `(${index + 1} of ${records.length})` : ''}
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {/* Grid layout for record details - same as before */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Equipment:</Typography>
              <Typography>{record.maintenance_item?.equipment_name || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Maintenance Date:</Typography>
              <Typography>{formatDate(record.maintenance_date)}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Maintenance Type:</Typography>
              <Typography sx={{ textTransform: 'capitalize' }}>{record.maintenance_type}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Status:</Typography>
              <Typography sx={{ textTransform: 'capitalize' }}>{record.status}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Performed By:</Typography>
              <Typography>{record.performed_by}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="subtitle2">Cost:</Typography>
              <Typography>{formatCurrency(record.cost)}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="subtitle2">Duration:</Typography>
              <Typography>{formatDuration(record.duration)}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Parts Replaced:</Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{record.parts_replaced || 'None'}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Issues Found:</Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{record.issues_found || 'None reported'}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Actions Taken:</Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{record.actions_taken}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Recommendations:</Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{record.recommendations || 'None provided'}</Typography>
            </Grid>
          </Grid>
        </Paper>
      ))}
    </Container>
  );
};

export default MaintenancePrintPage; 