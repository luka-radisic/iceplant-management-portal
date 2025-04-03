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
import PrintIcon from '@mui/icons-material/Print';

const MaintenancePrintPage: React.FC = () => {
  const [record, setRecord] = useState<MaintenanceRecord | null>(null);

  useEffect(() => {
    // Retrieve the record data from localStorage
    const storedData = localStorage.getItem('printMaintenanceRecord');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData) as MaintenanceRecord;
        setRecord(parsedData);
        // Optional: Clear the item after loading to prevent stale data
        // localStorage.removeItem('printMaintenanceRecord');

        // Trigger print dialog automatically after a short delay
        const timer = setTimeout(() => {
          window.print();
        }, 500); // Adjust delay as needed

        return () => clearTimeout(timer);

      } catch (error) {
        console.error("Error parsing maintenance record from localStorage:", error);
        // Handle error, maybe redirect or show message
      }
    } else {
      console.error("No maintenance record data found in localStorage for printing.");
      // Handle case where data is missing
    }
  }, []);

  if (!record) {
    return (
      <Container>
        <Typography variant="h6" color="error" align="center" sx={{ mt: 4 }}>
          Error: Maintenance Record data not found for printing.
        </Typography>
      </Container>
    );
  }

  // Basic print layout
  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h1">
            Maintenance Record
          </Typography>
          <PrintIcon color="action" />
        </Box>
        <Divider sx={{ mb: 2 }} />

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
    </Container>
  );
};

export default MaintenancePrintPage; 