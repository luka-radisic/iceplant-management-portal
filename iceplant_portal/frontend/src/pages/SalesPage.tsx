import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSnackbar } from 'notistack';
import SalesForm from '../components/sales/SalesForm';
import { apiService, endpoints } from '../services/api';
import { Sale } from '../types/sales';

const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, sale: Sale) => {
    setAnchorEl(event.currentTarget);
    setSelectedSale(sale);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSale(null);
  };

  const handleStatusUpdate = async (newStatus: 'active' | 'canceled' | 'error') => {
    if (!selectedSale) return;

    const originalStatus = selectedSale.status;
    const saleIdToUpdate = selectedSale.id;

    setSales(prevSales => 
        prevSales.map(s => 
            s.id === saleIdToUpdate ? { ...s, status: newStatus } : s
        )
    );
    handleMenuClose();

    try {
        await apiService.updateSaleStatus(saleIdToUpdate, newStatus);
        enqueueSnackbar(`Sale ${selectedSale.si_number} status updated to ${newStatus}.`, { variant: 'success' });
    } catch (err) {
        console.error("Error updating sale status:", err);
        enqueueSnackbar(`Failed to update status for sale ${selectedSale.si_number}. Reverting change.`, { variant: 'error' });
        setSales(prevSales => 
            prevSales.map(s => 
                s.id === saleIdToUpdate ? { ...s, status: originalStatus } : s
            )
        );
    }
  };

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get(endpoints.sales);
      console.log('[SalesPage] Raw API Response:', JSON.stringify(response, null, 2));
      if (response && Array.isArray(response.results)) {
        console.log('[SalesPage] Using response.results');
        setSales(response.results);
      } else if (Array.isArray(response)) {
        console.log('[SalesPage] Using direct response array');
        setSales(response);
      } else {
        console.warn('[SalesPage] Received unexpected sales data format. Setting empty array.', response);
        setSales([]);
      }
    } catch (err) {
      console.error("Error fetching sales data:", err);
      setError("Failed to load recent sales.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleSaleAdded = () => {
    fetchSales();
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Sales Entry & Overview
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Enter New Sale
        </Typography>
        <SalesForm onSaleAdded={handleSaleAdded} />
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
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.length > 0 ? (
                  sales.map((sale) => {
                    console.log('[SalesPage] Mapping sale:', JSON.stringify(sale)); 
                    return (
                      <TableRow key={sale.id}>
                        <TableCell>{sale.si_number}</TableCell>
                        <TableCell>{sale.sale_date}</TableCell>
                        <TableCell>{sale.sale_time}</TableCell>
                        <TableCell>{sale.buyer_name}</TableCell>
                        <TableCell align="right">{sale.total_quantity}</TableCell>
                        <TableCell align="right">
                          {(() => {
                            const cost = parseFloat(String(sale.total_cost));
                            return !isNaN(cost) ? cost.toFixed(2) : 'N/A';
                          })()}
                        </TableCell>
                        <TableCell>{sale.payment_status}</TableCell>
                        <TableCell>{sale.status}</TableCell>
                        <TableCell padding="none">
                            <IconButton
                                aria-label="actions"
                                aria-controls={`actions-menu-${sale.id}`}
                                aria-haspopup="true"
                                onClick={(event) => handleMenuOpen(event, sale)}
                            >
                                <MoreVertIcon />
                            </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No sales data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Menu
            id={`actions-menu-${selectedSale?.id}`}
            anchorEl={anchorEl}
            open={isMenuOpen}
            onClose={handleMenuClose}
            MenuListProps={{
            'aria-labelledby': `actions-button-${selectedSale?.id}`,
            }}
        >
             {selectedSale?.status !== 'canceled' && (
                 <MenuItem onClick={() => handleStatusUpdate('canceled')}>
                     <ListItemIcon>
                         <CancelIcon fontSize="small" color="warning"/>
                     </ListItemIcon>
                     <ListItemText>Mark as Canceled</ListItemText>
                 </MenuItem>
             )}
             {selectedSale?.status !== 'error' && (
                 <MenuItem onClick={() => handleStatusUpdate('error')}>
                     <ListItemIcon>
                         <ErrorIcon fontSize="small" color="error"/>
                     </ListItemIcon>
                     <ListItemText>Mark as Error</ListItemText>
                 </MenuItem>
             )}
             {selectedSale?.status !== 'active' && (
                 <MenuItem onClick={() => handleStatusUpdate('active')}>
                     <ListItemIcon>
                         <CheckCircleIcon fontSize="small" color="success"/>
                     </ListItemIcon>
                     <ListItemText>Reactivate Sale</ListItemText>
                 </MenuItem>
             )}
         </Menu>
      </Paper>
    </Box>
  );
};

export default SalesPage; 