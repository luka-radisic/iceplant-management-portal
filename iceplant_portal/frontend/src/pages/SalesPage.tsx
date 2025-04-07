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
  Button,
  Autocomplete
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
import StatusChip from '../components/common/StatusChip';
import { apiService, endpoints } from '../services/api';
import { Sale } from '../types/sales';
import { BuyerLight } from '../types/buyers';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format } from 'date-fns';

interface SaleSummary {
  totalSales: number;
  totalRevenue: number;
  averageSaleValue: number;
  activeCount: number;
  canceledCount: number;
  errorCount: number;
}

const SalesPage: React.FC = (): React.ReactElement => {
  const [sales, setSales] = useState<Sale[]>([]);
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
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filtering state
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterBuyer, setFilterBuyer] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<Date | null>(null);
  const [filterDateTo, setFilterDateTo] = useState<Date | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof Sale>('sale_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Summary state
  const [summaryData, setSummaryData] = useState<SaleSummary | null>(null);
  const [showSummary, setShowSummary] = useState<boolean>(false);

  // For edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [editableSale, setEditableSale] = useState<Sale | null>(null);
  
  // For buyer autocomplete in edit dialog
  const [buyers, setBuyers] = useState<BuyerLight[]>([]);
  const [loadingBuyers, setLoadingBuyers] = useState<boolean>(false);
  const [selectedEditBuyer, setSelectedEditBuyer] = useState<BuyerLight | null>(null);

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
  const handleStatusUpdate = async (newStatus: 'processed' | 'canceled' | 'error') => {
    if (!selectedSale) return;

    const originalStatus = selectedSale.status;
    const saleIdToUpdate = selectedSale.id;

    // Optimistic update for both sales and filteredSales
    setSales(prevSales => 
        prevSales.map(s => 
            s.id === saleIdToUpdate ? { ...s, status: newStatus } : s
        )
    );
    
    handleMenuClose();

    try {
        await apiService.updateSaleStatus(saleIdToUpdate, newStatus);
        enqueueSnackbar(`Sale ${selectedSale.si_number} status updated to ${newStatus}.`, { variant: 'success' });
        
        // Clear cache to ensure we get fresh data on next fetch
        clearSalesCache();
        
        // Force refresh of filtered data
        await fetchSales();
    } catch (err) {
        console.error("Error updating sale status:", err);
        enqueueSnackbar(`Failed to update status for sale ${selectedSale.si_number}. Reverting change.`, { variant: 'error' });
        
        // Revert the change in case of error - update both states
        setSales(prevSales => 
            prevSales.map(s => 
                s.id === saleIdToUpdate ? { ...s, status: originalStatus } : s
            )
        );
    }
  };

  // Fetch sales with pagination parameters
  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = `?page=${page}&page_size=${pageSize}`;
      const filterParams = new URLSearchParams();
      if (filterStatus) filterParams.append('status', filterStatus);
      if (filterBuyer) {
        const trimmedBuyerName = filterBuyer.trim();
        filterParams.append('buyer_name__icontains', trimmedBuyerName);
      }
      if (filterDateFrom) filterParams.append('sale_date__gte', format(filterDateFrom, 'yyyy-MM-dd'));
      if (filterDateTo) filterParams.append('sale_date__lte', format(filterDateTo, 'yyyy-MM-dd'));
      
      if (sortField) {
        const sortParam = sortDirection === 'asc' ? sortField : `-${sortField}`;
        filterParams.append('ordering', sortParam);
      }
      filterParams.append('_t', Date.now().toString());
      
      const queryString = filterParams.toString() 
        ? `${query}&${filterParams.toString()}`
        : query;
        
      console.log(`[SalesPage] Full request URL: ${endpoints.sales}${queryString}`);
      const cacheKey = `sales_${queryString}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      let response;
      
      if (cachedData) {
        console.log('[SalesPage] Using cached data for query:', queryString);
        response = JSON.parse(cachedData);
      } else {
        console.log(`[SalesPage] Fetching sales with query: ${queryString}`);
        response = await apiService.get(`${endpoints.sales}${queryString}`);
        console.log('[SalesPage] Raw API Response:', response);
        console.log(`[SalesPage] DEBUG: API returned count: ${response?.count}, Results length: ${response?.results?.length}`);
        sessionStorage.setItem(cacheKey, JSON.stringify(response));
        setTimeout(() => {
          sessionStorage.removeItem(cacheKey);
        }, 2 * 60 * 1000);
      }
      
      if (response && response.results) {
        console.log(`[SalesPage] Setting ${response.results.length} sales results from page ${page}`);
        setSales(response.results);
        setTotalItems(response.count || 0);
        console.log(`[SalesPage] Total items: ${response.count}, pages: ${Math.ceil((response.count || 0) / pageSize)}`);
      } else if (Array.isArray(response)) {
        setSales(response);
        setTotalItems(response.length);
      } else {
        setSales([]);
        setTotalItems(0);
      }
      calculateSummary(response.results || response);
      
    } catch (err) {
      console.error("Error fetching sales data:", err);
      setError("Failed to load sales data.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterStatus, filterBuyer, filterDateFrom, filterDateTo, sortField, sortDirection]);

  // Fetch sales data when page or sorting changes
  useEffect(() => {
    console.log(`[SalesPage] Fetching data due to change in deps: page=${page}, buyer=${filterBuyer}, status=${filterStatus}, sort=${sortField}${sortDirection}`);
    fetchSales();
  }, [page, pageSize, filterStatus, filterBuyer, filterDateFrom, filterDateTo, sortField, sortDirection, fetchSales]);

  // Load buyers for filter autocomplete
  useEffect(() => {
    const loadBuyersForFilter = async () => {
      try {
        const response = await apiService.getActiveBuyers();
        setBuyers(response);
      } catch (error) {
        console.error("Failed to load buyers for filter:", error);
      }
    };
    
    loadBuyersForFilter();
  }, []);

  // Calculate summary data from sales
  const calculateSummary = (salesData: Sale[]) => {
    if (!salesData || salesData.length === 0) {
      setSummaryData(null);
      return;
    }
    
    const processedCount = salesData.filter(s => s.status === 'processed').length;
    const canceledCount = salesData.filter(s => s.status === 'canceled').length;
    const errorCount = salesData.filter(s => s.status === 'error').length;
    
    // Convert total_cost strings to numbers for calculation
    const totalRevenue = salesData
      .filter(s => s.status === 'processed')
      .reduce((sum, sale) => {
        const cost = typeof sale.total_cost === 'string' 
          ? parseFloat(sale.total_cost) 
          : (sale.total_cost || 0);
        return sum + (isNaN(cost) ? 0 : cost);
      }, 0);
    
    const summary: SaleSummary = {
      totalSales: salesData.length,
      totalRevenue,
      averageSaleValue: processedCount > 0 ? totalRevenue / processedCount : 0,
      activeCount: processedCount,
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
    
    // Let the backend handle sorting via the fetchSales call
    // which will be triggered by the useEffect watching these values
  };

  // Reset filters
  const resetFilters = () => {
    console.log('[SalesPage] Resetting all filters');
    let needsPageReset = page !== 1;
    let hadActiveFilters = filterStatus || filterBuyer || filterDateFrom || filterDateTo;

    setFilterStatus('');
    setFilterBuyer('');
    setFilterDateFrom(null);
    setFilterDateTo(null);
    clearSalesCache();

    if (needsPageReset) {
        setPage(1);
    } else if (hadActiveFilters) {
        // Main effect should re-run due to changed deps
    }
    console.log('[SalesPage] Filters reset. Effect will fetch.');
  };

  // Handle page change
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    console.log(`[SalesPage] Changing to page ${value}`);
    setPage(value);
    // Page changes will trigger fetchSales via useEffect
  };

  // Handle filter changes
  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    const newStatus = event.target.value as string;
    console.log(`[SalesPage] Status filter changed to: ${newStatus}`);
    setFilterStatus(newStatus);
    if (page !== 1) {
      setPage(1); // Reset page, fetch triggered by useEffect
    }
  };

  // Update date filter handlers
  const handleDateFromChange = (newValue: Date | null) => {
    console.log(`[SalesPage] Date From filter changed to:`, newValue);
    setFilterDateFrom(newValue);
    if (page !== 1) {
      setPage(1); // Reset page, fetch triggered by useEffect
    }
  };

  const handleDateToChange = (newValue: Date | null) => {
    console.log(`[SalesPage] Date To filter changed to:`, newValue);
    setFilterDateTo(newValue);
    if (page !== 1) {
      setPage(1); // Reset page, fetch triggered by useEffect
    }
  };

  // Fetch buyers for autocomplete
  const fetchBuyers = async () => {
    setLoadingBuyers(true);
    try {
      const response = await apiService.getActiveBuyers();
      console.log("Loaded buyers for autocomplete:", response);
      
      // Sort buyers alphabetically by name for better usability
      const sortedBuyers = [...response].sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
      
      setBuyers(sortedBuyers);
    } catch (error) {
      console.error("Failed to load buyers:", error);
      enqueueSnackbar("Failed to load buyers list", { variant: 'error' });
    } finally {
      setLoadingBuyers(false);
    }
  };

  // Modify handleOpenEditDialog to load buyers
  const handleOpenEditDialog = (sale: Sale) => {
    setEditableSale(sale);
    setEditDialogOpen(true);
    handleMenuClose();
    
    // Fetch buyers for autocomplete
    fetchBuyers();
    
    // If the sale has a buyer, find and set the selected buyer
    if (sale.buyer) {
      setSelectedEditBuyer(sale.buyer);
    } else {
      setSelectedEditBuyer(null);
    }
  };

  // Function to format currency in Philippine Peso
  const formatCurrency = (value: number | string): string => {
    if (value === null || value === undefined || value === '') return 'N/A';
    
    // Convert to number
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';
    
    // Format the number with thousand separators and 2 decimal places
    const formattedNumber = numValue.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Explicitly prepend the Philippine Peso symbol
    return `₱${formattedNumber}`;
  };

  // Handle print view for a sale
  const handlePrintSale = (sale: Sale) => {
    // Store the selected sale in localStorage for the print view to access
    localStorage.setItem('printSale', JSON.stringify(sale));
    // Open the print view in a new window/tab
    window.open(`/sales/print/${sale.id}`, '_blank');
  };

  // Handle buyer selection from autocomplete in edit dialog
  const handleEditBuyerChange = (_event: React.SyntheticEvent, newValue: BuyerLight | string | null) => {
    if (typeof newValue === 'string') {
      // Handle the case when newValue is a string
      if (editableSale) {
        setEditableSale({
          ...editableSale,
          buyer_name: newValue,
          buyer: undefined // Use undefined instead of null to match the type
        });
      }
      setSelectedEditBuyer(null);
      return;
    }
    
    setSelectedEditBuyer(newValue as BuyerLight | null);
    
    if (newValue && editableSale && typeof newValue !== 'string') {
      // Update form with selected buyer's info
      setEditableSale({
        ...editableSale,
        buyer: newValue,
        buyer_name: newValue.name,
        buyer_contact: newValue.phone || newValue.email || editableSale.buyer_contact || '',
      });
      
      enqueueSnackbar(`Buyer "${newValue.name}" selected`, { 
        variant: 'success',
        autoHideDuration: 2000 
      });
    } else if (editableSale) {
      // Clear buyer reference but keep the name (user might be typing)
      setEditableSale({
        ...editableSale,
        buyer: undefined, // Use undefined instead of null
        buyer_name: editableSale.buyer_name, // preserve the buyer name when clearing buyer object
      });
    }
  };

  // Update Autocomplete handlers
  const handleBuyerFilterChange = (event: any, newValue: string | BuyerLight | null) => {
    console.log('[SalesPage] Buyer filter selection changed:', newValue);
    let buyerNameToSet = '';
    if (typeof newValue === 'string') {
        buyerNameToSet = newValue; // User typed something and pressed Enter (freeSolo)
    } else if (newValue) {
        buyerNameToSet = newValue.name; // User selected an option
    }
    // Else: User cleared the input (newValue is null)

    setFilterBuyer(buyerNameToSet);
    if (page !== 1) {
        setPage(1); // Reset page, fetch triggered by useEffect
    }
  };

  const handleBuyerInputChange = (event: any, newInputValue: string, reason: string) => {
    console.log(`[SalesPage] Buyer input changed: '${newInputValue}', reason: ${reason}`);
    // Only update the state for display as user types
    // The actual filter trigger happens via onChange (handleBuyerFilterChange)
    // when user selects, clears, or hits enter (freeSolo)
    if (reason === 'input') {
        setFilterBuyer(newInputValue);
    }
    // If you wanted search-as-you-type, you'd add debounce logic here
    // that eventually calls setPage(1)
  };

  // Function to clear sales cache
  const clearSalesCache = () => {
    console.log('[SalesPage] Clearing sales cache...');
    let clearedCount = 0;
    
    // Find all sales cache keys and remove them
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('sales_')) {
        sessionStorage.removeItem(key);
        clearedCount++;
      }
    });
    
    console.log(`[SalesPage] Cleared ${clearedCount} cache entries`);
  };

  const handleSaleAdded = () => {
    // Clear cache to ensure we get fresh data
    clearSalesCache();
    
    // Reset to page 1 to ensure the new sale is visible
    // fetchSales will be called via the page change useEffect
    if (page !== 1) {
        setPage(1);
    } else {
        // If already on page 1, force a refetch
        fetchSales(); 
    }
  };

  // Use our new StatusChip component instead of renderStatus function
  const renderStatus = (status: string) => {
    return <StatusChip status={status} />;
  };

  // Toggle summary dialog
  const toggleSummaryDialog = () => {
    setShowSummary(!showSummary);
  };

  // Validate the edit form
  const validateEditForm = (sale?: Sale | null): boolean => {
    if (!sale) return false;
    // Basic validation: check if required fields have values
    if (!sale.si_number || !sale.buyer_name || !sale.sale_date) {
      enqueueSnackbar('SI Number, Buyer Name, and Sale Date are required.', { variant: 'warning' });
      return false;
    }
    // Add more specific validation rules if needed
    return true;
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditableSale(null);
    setSelectedEditBuyer(null);
    
    // If we came from admin route, update URL to remove /admin/sales/sale/:id/change
    if (location.pathname.includes('/admin/sales/sale/')) {
      navigate('/sales', { replace: true });
    }
  };

  // Handle editing a sale
  const handleEditSale = async (updatedSale: Partial<Sale>) => {
    if (!editableSale) return;
    
    if (!validateEditForm(editableSale as Sale)) {
      return;
    }
    
    try {
      setLoading(true);
      const dataToSend: any = { ...updatedSale };
      
      // Ensure sale_date is formatted correctly
      if (dataToSend.sale_date && typeof dataToSend.sale_date === 'string') {
        // Assuming it's already YYYY-MM-DD from the form
        dataToSend.sale_date = dataToSend.sale_date.substring(0, 10);
      } else if (dataToSend.sale_date instanceof Date) {
        dataToSend.sale_date = format(dataToSend.sale_date, 'yyyy-MM-dd');
      }
      
      // Ensure buyer_id is handled correctly based on selectedEditBuyer
      if (selectedEditBuyer) {
        dataToSend.buyer_id = selectedEditBuyer.id;
        dataToSend.buyer_name = selectedEditBuyer.name; // Ensure name is consistent
      } else if (updatedSale.buyer_name && !updatedSale.buyer) {
        // If a name exists but no buyer object/ID, try to find/create
        console.log(`[SalesPage] Attempting to find/create buyer for name: ${updatedSale.buyer_name}`);
        try {
          const buyerResponse = await apiService.searchOrCreateBuyerWithId(updatedSale.buyer_name);
          if (buyerResponse && buyerResponse.id) {
            console.log(`[SalesPage] Found/created buyer ID: ${buyerResponse.id}`);
            dataToSend.buyer_id = buyerResponse.id;
            // Optionally update the buyers list state if a new buyer was created
            if (!buyers.some(b => b.id === buyerResponse.id)) {
               setBuyers(prev => [...prev, buyerResponse].sort((a, b) => a.name.localeCompare(b.name)));
            }
          } else {
             console.warn(`[SalesPage] Could not find or create buyer for name: ${updatedSale.buyer_name}`);
             // Decide how to proceed: maybe prevent saving or save without buyer_id
             // For now, we proceed but log a warning. Backend might handle name-only.
             delete dataToSend.buyer_id; // Remove potentially null buyer_id
          }
        } catch (err) {
          console.error("[SalesPage] Error finding/creating buyer during edit:", err);
          // Continue saving sale without a linked buyer ID
          delete dataToSend.buyer_id;
        }
      } else {
         // No buyer selected or typed
         dataToSend.buyer_id = null; 
      }
      
      // Remove the buyer object if it exists, we only need buyer_id
      delete dataToSend.buyer; 

      console.log('[SalesPage] Sending updated sale data:', dataToSend);
      await apiService.put(`${endpoints.sales}${editableSale.id}/`, dataToSend);
      enqueueSnackbar(`Sale ${editableSale.si_number} updated successfully`, { variant: 'success' });
      
      clearSalesCache(); // Clear cache
      fetchSales(); // Refresh sales list
      handleCloseEditDialog(); // Close dialog
    } catch (err: any) {
      console.error("Error updating sale:", err);
      let errorMessage = "Failed to update sale";
      if (err.response && err.response.data) {
        // Try to extract more specific error from backend response
        errorMessage += `: ${JSON.stringify(err.response.data)}`;
      }
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
                    <MenuItem value="processed">Processed</MenuItem>
                    <MenuItem value="canceled">Canceled</MenuItem>
                    <MenuItem value="error">Error</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <Autocomplete
                  size="small"
                  freeSolo
                  options={buyers}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') {
                      return option;
                    }
                    return option.name;
                  }}
                  renderOption={(props, option) => (
                    <li {...props} key={typeof option === 'string' ? option : option.id}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>
                          {typeof option === 'string' ? option : option.name}
                        </div>
                        {typeof option !== 'string' && option.company_name && (
                          <div style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)' }}>
                            {option.company_name}
                          </div>
                        )}
                      </div>
                    </li>
                  )}
                  inputValue={filterBuyer}
                  onInputChange={handleBuyerInputChange}
                  onChange={handleBuyerFilterChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Buyer Name"
                      margin="normal"
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                      sx={{ mt: 0 }}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={2}>
                <DatePicker
                  label="From Date"
                  value={filterDateFrom}
                  onChange={handleDateFromChange}
                  slotProps={{ textField: { fullWidth: true, size: 'small', InputLabelProps: { shrink: true } } }}
                  format="yyyy-MM-dd"
                />
              </Grid>
              
              <Grid item xs={12} sm={2}>
                <DatePicker
                  label="To Date"
                  value={filterDateTo}
                  onChange={handleDateToChange}
                  slotProps={{ textField: { fullWidth: true, size: 'small', InputLabelProps: { shrink: true } } }}
                  format="yyyy-MM-dd"
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
                    {sales.length > 0 ? (
                      sales.map((sale) => {
                        console.log('[SalesPage] Mapping sale:', JSON.stringify(sale)); 
                        
                        // Calculate balance if partially paid
                        let balance = 0;
                        let isPartiallyPaid = false;
                        if (sale.payment_status === 'Partially Paid') {
                          const totalCost = typeof sale.total_cost === 'string' ? parseFloat(sale.total_cost) : (sale.total_cost || 0);
                          const totalPayment = typeof sale.total_payment === 'string' ? parseFloat(sale.total_payment) : (sale.total_payment || 0);
                          if (!isNaN(totalCost) && !isNaN(totalPayment)) {
                            balance = totalCost - totalPayment;
                            isPartiallyPaid = true;
                          }
                        }
                        
                        return (
                          <TableRow key={sale.id}>
                            <TableCell>
                              <Button 
                                color="primary" 
                                onClick={() => handlePrintSale(sale)}
                                sx={{ 
                                  textDecoration: 'none', 
                                  p: 0, 
                                  minWidth: 'auto',
                                  textAlign: 'left',
                                  fontWeight: 'inherit',
                                  fontSize: 'inherit'
                                }}
                              >
                                {sale.si_number}
                              </Button>
                            </TableCell>
                            <TableCell>{sale.sale_date}</TableCell>
                            <TableCell>{sale.sale_time}</TableCell>
                            <TableCell>{sale.buyer_name}</TableCell>
                            <TableCell align="right">{sale.total_quantity}</TableCell>
                            <TableCell align="right">{formatCurrency(sale.total_cost)}</TableCell>
                            <TableCell>
                              {sale.payment_status}
                              {isPartiallyPaid && balance > 0 && (
                                <Typography variant="caption" display="block" sx={{ color: 'warning.main', fontSize: '0.75rem' }}>
                                  (Balance: {formatCurrency(balance)})
                                </Typography>
                              )}
                            </TableCell>
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
                  siblingCount={1}
                  boundaryCount={1}
                  showFirstButton
                  showLastButton
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
               {selectedSale?.status !== 'processed' && (
                   <MenuItem onClick={() => handleStatusUpdate('processed')}>
                       <ListItemIcon>
                           <CheckCircleIcon fontSize="small" color="success"/>
                       </ListItemIcon>
                       <ListItemText>Mark as Processed</ListItemText>
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
                     <Card sx={{ backgroundColor: '#fafafa', p: 3, boxShadow: 3, borderRadius: 2 }}>
                       <CardContent>
                         <Typography variant="h6" gutterBottom fontWeight="bold">
                           Sales Overview
                         </Typography>
                         <Divider sx={{ mb: 2 }} />
                         <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
                           {summaryData.totalSales} Sales
                         </Typography>
                         <Typography variant="subtitle1" gutterBottom>
                           Total Revenue <strong>(PHP)</strong>:
                         </Typography>
                         <Typography variant="h5" fontWeight="bold" color="secondary" gutterBottom>
                           ₱{summaryData.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </Typography>
                         <Typography variant="subtitle1" gutterBottom>
                           Average Sale <strong>(PHP)</strong>:
                         </Typography>
                         <Typography variant="h6" fontWeight="bold" gutterBottom>
                           ₱{summaryData.averageSaleValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </Typography>
                       </CardContent>
                     </Card>
                   </Grid>
                   <Grid item xs={12} md={6}>
                     <Card sx={{ backgroundColor: '#fafafa', p: 3, boxShadow: 3, borderRadius: 2 }}>
                       <CardContent>
                         <Typography variant="h6" gutterBottom fontWeight="bold">
                           Status Breakdown
                         </Typography>
                         <Divider sx={{ mb: 2 }} />
                         <Typography variant="subtitle1" color="success.main" gutterBottom>
                           Processed: <strong>{summaryData.activeCount}</strong> ({((summaryData.activeCount / summaryData.totalSales) * 100).toFixed(1)}%)
                         </Typography>
                         <Typography variant="subtitle1" color="warning.main" gutterBottom>
                           Canceled: <strong>{summaryData.canceledCount}</strong> ({((summaryData.canceledCount / summaryData.totalSales) * 100).toFixed(1)}%)
                         </Typography>
                         <Typography variant="subtitle1" color="error.main" gutterBottom>
                           Error: <strong>{summaryData.errorCount}</strong> ({((summaryData.errorCount / summaryData.totalSales) * 100).toFixed(1)}%)
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
               <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <Typography variant="h6">
                   Edit Sale {editableSale?.si_number}
                 </Typography>
                 {editableSale?.buyer_name && (
                   <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.3rem', ml: 2 }}>
                     {editableSale.buyer_name}
                   </Typography>
                 )}
               </Box>
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
                     <Autocomplete
                       id="edit-buyer-autocomplete"
                       value={selectedEditBuyer}
                       onChange={handleEditBuyerChange}
                       options={buyers}
                       getOptionLabel={(option) => {
                         // Handle both string and BuyerLight types
                         if (typeof option === 'string') {
                           return option;
                         }
                         return option.name;
                       }}
                       filterOptions={(options, state) => {
                         const inputValue = state.inputValue.toLowerCase().trim();
                         if (!inputValue) return [];
                         
                         const terms = inputValue.split(/\s+/);
                         
                         return options.filter(option => {
                           const fullName = option.name.toLowerCase();
                           const nameParts = fullName.split(/\s+/);
                           
                           if (terms.length > 1 && terms.length <= nameParts.length) {
                             let matchesAllTerms = true;
                             
                             for (let i = 0; i < terms.length; i++) {
                               const term = terms[i];
                               const matchesAnyPart = nameParts.some((part, index) => {
                                 if (i === 0 || index >= i) {
                                   return part.startsWith(term);
                                 }
                                 return false;
                               });
                               
                               if (!matchesAnyPart) {
                                 matchesAllTerms = false;
                                 break;
                               }
                             }
                             
                             return matchesAllTerms;
                           }
                           
                           return nameParts.some(part => part.startsWith(inputValue));
                         });
                       }}
                       renderOption={(props, option) => (
                         <li {...props} key={option.id} style={{ padding: '8px 16px' }}>
                           <div>
                             <div style={{ fontWeight: 'bold' }}>{option.name}</div>
                             {option.company_name && (
                               <div style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)' }}>{option.company_name}</div>
                             )}
                             {option.phone && (
                               <div style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)' }}>{option.phone}</div>
                             )}
                           </div>
                         </li>
                       )}
                       freeSolo
                       autoHighlight
                       clearOnEscape
                       loading={loadingBuyers}
                       noOptionsText="No matching buyers found"
                       loadingText="Loading buyers..."
                       renderInput={(params) => (
                         <TextField
                           {...params}
                           label="Buyer Name"
                           required
                           fullWidth
                           margin="normal"
                           onChange={(e) => {
                             setEditableSale({...editableSale, buyer_name: e.target.value});
                             if (e.target.value === '') {
                               setSelectedEditBuyer(null);
                             }
                           }}
                           value={editableSale.buyer_name}
                           helperText="Start typing to search for buyers by name or ID"
                           InputProps={{
                             ...params.InputProps,
                             sx: {
                               fontSize: '1.2rem'
                             },
                             endAdornment: (
                               <>
                                 {loadingBuyers ? <CircularProgress color="inherit" size={20} /> : null}
                                 {params.InputProps.endAdornment}
                               </>
                             ),
                           }}
                         />
                       )}
                     />
                     <DatePicker
                       label="Sale Date"
                       value={editableSale.sale_date ? new Date(editableSale.sale_date + 'T00:00:00') : null}
                       onChange={(newValue) => setEditableSale({ ...editableSale, sale_date: newValue ? format(newValue, 'yyyy-MM-dd') : '' })}
                       slotProps={{ textField: { fullWidth: true, margin: 'normal', InputLabelProps: { shrink: true } } }}
                       format="yyyy-MM-dd"
                     />
                     <TextField
                       fullWidth
                       label="Buyer Contact"
                       value={editableSale.buyer_contact || ''}
                       onChange={(e) => setEditableSale({...editableSale, buyer_contact: e.target.value})}
                       margin="normal"
                       placeholder="Phone or email"
                       InputProps={{
                       }}
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
                         onChange={(e) => setEditableSale({ ...editableSale, status: e.target.value as 'processed' | 'canceled' | 'error' })}
                       >
                         <MenuItem value="processed">Processed</MenuItem>
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
                 disabled={!validateEditForm(editableSale as Sale)}
               >
                 Save Changes
               </Button>
             </DialogActions>
           </Dialog>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default SalesPage; 