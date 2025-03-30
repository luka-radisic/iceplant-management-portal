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
  ListItemText,
  Chip,
  TextField,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Grid,
  Pagination,
  TableSortLabel,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CancelIcon from '@mui/icons-material/Cancel';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { useSnackbar } from 'notistack';
import SalesForm from '../components/sales/SalesForm';
import { apiService, endpoints } from '../services/api';
import { Sale } from '../types/sales';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

interface SaleSummary {
  totalSales: number;
  totalRevenue: number;
  averageSaleValue: number;
  activeCount: number;
  canceledCount: number;
  errorCount: number;
}

const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const isMenuOpen = Boolean(anchorEl);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filtering state
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterBuyer, setFilterBuyer] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof Sale>('sale_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Summary state
  const [summaryData, setSummaryData] = useState<SaleSummary | null>(null);
  const [showSummary, setShowSummary] = useState<boolean>(false);

  // For edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [editableSale, setEditableSale] = useState<Sale | null>(null);

  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, sale: Sale) => {
    setAnchorEl(event.currentTarget);
    setSelectedSale(sale);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSale(null);
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus: 'active' | 'canceled' | 'error') => {
    if (!selectedSale) return;

    const originalStatus = selectedSale.status;
    const saleIdToUpdate = selectedSale.id;

    // Optimistic update
    setSales(prevSales => 
        prevSales.map(s => 
            s.id === saleIdToUpdate ? { ...s, status: newStatus } : s
        )
    );
    handleMenuClose();

    try {
        await apiService.updateSaleStatus(saleIdToUpdate, newStatus);
        enqueueSnackbar(`Sale ${selectedSale.si_number} status updated to ${newStatus}.`, { variant: 'success' });
        applyFilters(); // Refresh filtered data
    } catch (err) {
        console.error("Error updating sale status:", err);
        enqueueSnackbar(`Failed to update status for sale ${selectedSale.si_number}. Reverting change.`, { variant: 'error' });
        
        // Revert the change in case of error
        setSales(prevSales => 
            prevSales.map(s => 
                s.id === saleIdToUpdate ? { ...s, status: originalStatus } : s
            )
        );
        applyFilters(); // Refresh filtered data
    }
  };

  // Fetch sales with pagination parameters
  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query with pagination parameters
      const query = `?page=${page}&page_size=${pageSize}`;
      
      // Add filter parameters if they exist
      const filterParams = new URLSearchParams();
      if (filterStatus) filterParams.append('status', filterStatus);
      if (filterBuyer) filterParams.append('buyer_name__icontains', filterBuyer);
      if (filterDateFrom) filterParams.append('sale_date__gte', filterDateFrom);
      if (filterDateTo) filterParams.append('sale_date__lte', filterDateTo);
      
      const queryString = filterParams.toString() 
        ? `${query}&${filterParams.toString()}`
        : query;
      
      const response = await apiService.get(`${endpoints.sales}${queryString}`);
      console.log('[SalesPage] Raw API Response:', JSON.stringify(response, null, 2));
      
      if (response && response.results) {
        setSales(response.results);
        setFilteredSales(response.results);
        setTotalItems(response.count || 0);
      } else if (Array.isArray(response)) {
        setSales(response);
        setFilteredSales(response);
        setTotalItems(response.length);
      } else {
        setSales([]);
        setFilteredSales([]);
        setTotalItems(0);
      }
      
      // Also calculate summary
      calculateSummary(response.results || response);
      
    } catch (err) {
      console.error("Error fetching sales data:", err);
      setError("Failed to load sales data.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterStatus, filterBuyer, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Calculate summary data from sales
  const calculateSummary = (salesData: Sale[]) => {
    if (!salesData || salesData.length === 0) {
      setSummaryData(null);
      return;
    }
    
    const activeCount = salesData.filter(s => s.status === 'active').length;
    const canceledCount = salesData.filter(s => s.status === 'canceled').length;
    const errorCount = salesData.filter(s => s.status === 'error').length;
    
    // Convert total_cost strings to numbers for calculation
    const totalRevenue = salesData
      .filter(s => s.status === 'active')
      .reduce((sum, sale) => {
        const cost = typeof sale.total_cost === 'string' 
          ? parseFloat(sale.total_cost) 
          : (sale.total_cost || 0);
        return sum + (isNaN(cost) ? 0 : cost);
      }, 0);
    
    const summary: SaleSummary = {
      totalSales: salesData.length,
      totalRevenue,
      averageSaleValue: activeCount > 0 ? totalRevenue / activeCount : 0,
      activeCount,
      canceledCount,
      errorCount
    };
    
    setSummaryData(summary);
  };

  // Handle sorting
  const handleSort = (field: keyof Sale) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(field);
    
    // Apply sorting to the filtered sales
    const sortedSales = [...filteredSales].sort((a, b) => {
      if (a[field] < b[field]) return isAsc ? 1 : -1;
      if (a[field] > b[field]) return isAsc ? -1 : 1;
      return 0;
    });
    
    setFilteredSales(sortedSales);
  };

  // Apply filters locally
  const applyFilters = () => {
    let filtered = [...sales];
    
    if (filterStatus) {
      filtered = filtered.filter(sale => sale.status === filterStatus);
    }
    
    if (filterBuyer) {
      filtered = filtered.filter(sale => 
        sale.buyer_name.toLowerCase().includes(filterBuyer.toLowerCase())
      );
    }
    
    if (filterDateFrom) {
      filtered = filtered.filter(sale => 
        new Date(sale.sale_date) >= new Date(filterDateFrom)
      );
    }
    
    if (filterDateTo) {
      filtered = filtered.filter(sale => 
        new Date(sale.sale_date) <= new Date(filterDateTo)
      );
    }
    
    // Apply current sort
    filtered.sort((a, b) => {
      if (a[sortField] < b[sortField]) return sortDirection === 'asc' ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredSales(filtered);
  };

  // Reset filters
  const resetFilters = () => {
    setFilterStatus('');
    setFilterBuyer('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(1);
  };

  // Handle page change
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  // Handle filter changes
  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setFilterStatus(event.target.value as string);
  };

  const handleBuyerFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterBuyer(event.target.value);
  };

  const handleDateFromChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDateFrom(event.target.value);
  };

  const handleDateToChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDateTo(event.target.value);
  };

  // Apply filters when filter values change
  useEffect(() => {
    applyFilters();
  }, [filterStatus, filterBuyer, filterDateFrom, filterDateTo, sales, sortField, sortDirection]);

  const handleSaleAdded = () => {
    fetchSales();
  };

  // Render status with appropriate color
  const renderStatus = (status: string) => {
    let color = 'default';
    let icon = null;
    
    switch(status) {
      case 'active':
        color = 'success';
        icon = <CheckCircleIcon fontSize="small" />;
        break;
      case 'canceled':
        color = 'warning';
        icon = <CancelIcon fontSize="small" />;
        break;
      case 'error':
        color = 'error';
        icon = <ErrorIcon fontSize="small" />;
        break;
    }
    
    return (
      <Chip 
        size="small"
        label={status.charAt(0).toUpperCase() + status.slice(1)} 
        color={color as any}
        icon={icon}
      />
    );
  };

  // Toggle summary dialog
  const toggleSummaryDialog = () => {
    setShowSummary(!showSummary);
  };

  // Edit in Admin handler
  const handleEditInAdmin = (saleId: number) => {
    handleMenuClose();
    navigate(`/admin/sales/sale/${saleId}/change`);
  };

  // Check if we're coming from an admin edit route
  useEffect(() => {
    const checkForAdminEdit = async () => {
      // Check if we have a sale ID in the URL params (from redirect)
      const saleIdFromPath = location.pathname.match(/\/admin\/sales\/sale\/(\d+)\/change/);
      const saleId = saleIdFromPath ? parseInt(saleIdFromPath[1]) : null;
      
      if (saleId) {
        try {
          setLoading(true);
          // Fetch the specific sale details
          const response = await apiService.get(`${endpoints.sales}${saleId}/`);
          if (response) {
            setEditableSale(response);
            setEditDialogOpen(true);
          }
        } catch (err) {
          console.error("Error fetching sale for editing:", err);
          enqueueSnackbar("Could not load sale details for editing", { variant: 'error' });
        } finally {
          setLoading(false);
        }
      }
    };
    
    checkForAdminEdit();
  }, [location.pathname, enqueueSnackbar]);

  // Handle editing a sale
  const handleEditSale = async (updatedSale: Partial<Sale>) => {
    if (!editableSale) return;
    
    try {
      await apiService.put(`${endpoints.sales}${editableSale.id}/`, updatedSale);
      enqueueSnackbar(`Sale ${editableSale.si_number} updated successfully`, { variant: 'success' });
      fetchSales(); // Refresh sales list
      handleCloseEditDialog();
    } catch (err) {
      console.error("Error updating sale:", err);
      enqueueSnackbar("Failed to update sale", { variant: 'error' });
    }
  };
  
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditableSale(null);
    
    // If we came from admin route, update URL to remove /admin/sales/sale/:id/change
    if (location.pathname.includes('/admin/sales/sale/')) {
      navigate('/sales', { replace: true });
    }
  };

  // Add these just before the return statement
  const handleOpenEditDialog = (sale: Sale) => {
    setEditableSale(sale);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Sales Entry & Overview
      </Typography>
      
      {/* Sale Entry Form */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Enter New Sale
        </Typography>
        <SalesForm onSaleAdded={handleSaleAdded} />
      </Paper>
      
      {/* Sales List with Filters */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Recent Sales
          </Typography>
          <Box>
            <IconButton onClick={toggleSummaryDialog} title="View Sales Summary">
              <SummarizeIcon />
            </IconButton>
          </Box>
        </Box>
        
        {/* Filters Section */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Typography variant="subtitle2">
                <FilterListIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                Filters:
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={filterStatus}
                  label="Status"
                  onChange={handleStatusFilterChange}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="canceled">Canceled</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                label="Buyer Name"
                value={filterBuyer}
                onChange={handleBuyerFilterChange}
                margin="normal"
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                size="small"
                label="From Date"
                type="date"
                value={filterDateFrom}
                onChange={handleDateFromChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                size="small"
                label="To Date"
                type="date"
                value={filterDateTo}
                onChange={handleDateToChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={resetFilters}
              >
                Reset
              </Button>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Sales Data Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 'bold' } }}>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'si_number'}
                        direction={sortField === 'si_number' ? sortDirection : 'asc'}
                        onClick={() => handleSort('si_number')}
                      >
                        SI No.
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'sale_date'}
                        direction={sortField === 'sale_date' ? sortDirection : 'asc'}
                        onClick={() => handleSort('sale_date')}
                      >
                        Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'buyer_name'}
                        direction={sortField === 'buyer_name' ? sortDirection : 'asc'}
                        onClick={() => handleSort('buyer_name')}
                      >
                        Buyer
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">Total Qty</TableCell>
                    <TableCell align="right">Total Cost</TableCell>
                    <TableCell>Payment Status</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortField === 'status'}
                        direction={sortField === 'status' ? sortDirection : 'asc'}
                        onClick={() => handleSort('status')}
                      >
                        Status
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSales.length > 0 ? (
                    filteredSales.map((sale) => {
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
                          <TableCell>{renderStatus(sale.status)}</TableCell>
                          <TableCell padding="none">
                              <IconButton
                                  aria-label="actions"
                                  aria-controls={`actions-menu-${sale.id}`}
                                  aria-haspopup="true"
                                  onClick={(event) => handleMenuOpen(event, sale)}
                                  size="small"
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
            
            {/* Pagination */}
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination 
                count={Math.ceil(totalItems / pageSize)}
                page={page}
                onChange={handlePageChange} 
                color="primary"
              />
            </Box>
          </>
        )}
        
        {/* Actions Menu */}
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
             {/* Edit option only for admin users */}
             {isAdmin && selectedSale && (
                <MenuItem onClick={() => handleOpenEditDialog(selectedSale)}>
                  <ListItemIcon>
                    <EditIcon fontSize="small" color="primary"/>
                  </ListItemIcon>
                  <ListItemText>Edit Sale</ListItemText>
                </MenuItem>
             )}
         </Menu>
         
         {/* Summary Dialog */}
         <Dialog open={showSummary} onClose={toggleSummaryDialog} maxWidth="md">
           <DialogTitle>
             Sales Summary
           </DialogTitle>
           <DialogContent>
             {summaryData ? (
               <Grid container spacing={2} sx={{ mt: 1 }}>
                 <Grid item xs={12} md={6}>
                   <Card>
                     <CardContent>
                       <Typography variant="h6" gutterBottom>
                         Sales Overview
                       </Typography>
                       <Typography variant="subtitle1">
                         Total Sales: {summaryData.totalSales}
                       </Typography>
                       <Typography variant="subtitle1" color="primary">
                         Total Revenue: ${summaryData.totalRevenue.toFixed(2)}
                       </Typography>
                       <Typography variant="subtitle1">
                         Average Sale Value: ${summaryData.averageSaleValue.toFixed(2)}
                       </Typography>
                     </CardContent>
                   </Card>
                 </Grid>
                 <Grid item xs={12} md={6}>
                   <Card>
                     <CardContent>
                       <Typography variant="h6" gutterBottom>
                         Status Breakdown
                       </Typography>
                       <Typography variant="subtitle1" color="success.main">
                         Active: {summaryData.activeCount} ({((summaryData.activeCount / summaryData.totalSales) * 100).toFixed(1)}%)
                       </Typography>
                       <Typography variant="subtitle1" color="warning.main">
                         Canceled: {summaryData.canceledCount} ({((summaryData.canceledCount / summaryData.totalSales) * 100).toFixed(1)}%)
                       </Typography>
                       <Typography variant="subtitle1" color="error.main">
                         Error: {summaryData.errorCount} ({((summaryData.errorCount / summaryData.totalSales) * 100).toFixed(1)}%)
                       </Typography>
                     </CardContent>
                   </Card>
                 </Grid>
               </Grid>
             ) : (
               <Typography>No summary data available</Typography>
             )}
           </DialogContent>
           <DialogActions>
             <Button onClick={toggleSummaryDialog}>Close</Button>
           </DialogActions>
         </Dialog>
         
         {/* Edit Sale Dialog */}
         <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
           <DialogTitle>
             Edit Sale {editableSale?.si_number}
           </DialogTitle>
           <DialogContent>
             {editableSale ? (
               <Grid container spacing={2} sx={{ mt: 1 }}>
                 <Grid item xs={12} md={6}>
                   <TextField
                     label="SI Number"
                     fullWidth
                     value={editableSale.si_number}
                     onChange={(e) => setEditableSale({ ...editableSale, si_number: e.target.value })}
                     margin="normal"
                   />
                   <TextField
                     label="Buyer Name"
                     fullWidth
                     value={editableSale.buyer_name}
                     onChange={(e) => setEditableSale({ ...editableSale, buyer_name: e.target.value })}
                     margin="normal"
                   />
                   <TextField
                     label="Sale Date"
                     type="date"
                     fullWidth
                     value={editableSale.sale_date}
                     onChange={(e) => setEditableSale({ ...editableSale, sale_date: e.target.value })}
                     margin="normal"
                     InputLabelProps={{ shrink: true }}
                   />
                 </Grid>
                 <Grid item xs={12} md={6}>
                   <TextField
                     label="Total Quantity"
                     fullWidth
                     value={editableSale.total_quantity}
                     margin="normal"
                     disabled
                     helperText="This is calculated automatically"
                   />
                   <TextField
                     label="Total Cost"
                     fullWidth
                     value={editableSale.total_cost}
                     margin="normal"
                     disabled
                     helperText="This is calculated automatically"
                   />
                   <FormControl fullWidth margin="normal">
                     <InputLabel>Status</InputLabel>
                     <Select
                       value={editableSale.status}
                       label="Status"
                       onChange={(e) => setEditableSale({ ...editableSale, status: e.target.value as 'active' | 'canceled' | 'error' })}
                     >
                       <MenuItem value="active">Active</MenuItem>
                       <MenuItem value="canceled">Canceled</MenuItem>
                       <MenuItem value="error">Error</MenuItem>
                     </Select>
                   </FormControl>
                 </Grid>
               </Grid>
             ) : (
               <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                 <CircularProgress />
               </Box>
             )}
           </DialogContent>
           <DialogActions>
             <Button onClick={handleCloseEditDialog}>Cancel</Button>
             <Button 
               onClick={() => handleEditSale(editableSale as Sale)} 
               variant="contained" 
               color="primary"
               disabled={!editableSale}
             >
               Save Changes
             </Button>
           </DialogActions>
         </Dialog>
      </Paper>
    </Box>
  );
};

export default SalesPage; 