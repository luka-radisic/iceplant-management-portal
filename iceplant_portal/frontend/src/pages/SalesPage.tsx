import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Alert
} from '@mui/material';
import SalesForm from '../components/sales/SalesForm';
import { apiService, endpoints } from '../services/api';
import { Sale } from '../types/sales';

const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.get(endpoints.sales);
        setSales(response.results || response);
      } catch (err) {
        console.error("Error fetching sales data:", err);
        setError("Failed to load recent sales.");
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Sales Entry & Overview
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Enter New Sale
        </Typography>
        <SalesForm />
      </Paper>
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Recent Sales
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SI No.</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Total Qty</TableCell>
                  <TableCell>Total Cost</TableCell>
                  <TableCell>Payment Status</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.length > 0 ? (
                  sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{sale.si_number}</TableCell>
                      <TableCell>{sale.sale_date}</TableCell>
                      <TableCell>{sale.sale_time}</TableCell>
                      <TableCell>{sale.buyer_name}</TableCell>
                      <TableCell align="right">{sale.total_quantity}</TableCell>
                      <TableCell align="right">{sale.total_cost?.toFixed(2)}</TableCell>
                      <TableCell>{sale.payment_status}</TableCell>
                      <TableCell>{sale.status}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No sales data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default SalesPage; 