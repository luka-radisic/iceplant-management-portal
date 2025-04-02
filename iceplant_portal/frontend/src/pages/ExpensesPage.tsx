import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
  FormControlLabel,
  Switch,
  Tooltip,
  Card,
  CardContent,
  InputAdornment,
  Alert,
  Pagination,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useSnackbar } from 'notistack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptIcon from '@mui/icons-material/Receipt';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LockIcon from '@mui/icons-material/Lock';
import { apiService, endpoints } from '../services/api';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import { useAuth } from '../contexts/AuthContext';

import type { Expense, ExpenseCategory, ExpenseSummaryByGroup, ExpenseSummaryByPayee } from '../types/api';

// Tab panel interface
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Get current date in YYYY-MM-DD format
const getCurrentDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Expense form initial values
const initialExpenseFormData = {
  date: getCurrentDateString(),
  payee: '',
  description: '',
  amount: 0,
  category: 'miscellaneous',
  reference_number: '',
  payment_method: 'cash',
  ice_plant_allocation: 0,
  notes: '',
};

// Expense summary component properties
interface ExpenseSummaryProps {
  title: string;
  total: number;
  icePlantTotal: number;
  count?: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      style={{ width: '100%' }}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const formatCurrency = (amount: number | null | undefined) => {
  // Handle null, undefined or NaN values
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(0);
  }
  
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(Number(amount));
};

// Summary card component
const SummaryCard: React.FC<ExpenseSummaryProps> = ({ title, total, icePlantTotal, count }) => {
  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h5" component="div" color="primary">
          {formatCurrency(total)}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Ice Plant: {formatCurrency(icePlantTotal)}
        </Typography>
        {count !== undefined && (
          <Typography variant="body2" color="textSecondary">
            {count} expenses
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const ExpensesPage: React.FC = () => {
  // Get auth context for admin check
  const { isAdmin } = useAuth();
  
  // State for expense data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  
  // State for summary data
  const [summaryCategoryData, setSummaryCategoryData] = useState<ExpenseSummaryByGroup[]>([]);
  const [summaryMonthData, setSummaryMonthData] = useState<ExpenseSummaryByGroup[]>([]);
  const [summaryPayeeData, setSummaryPayeeData] = useState<ExpenseSummaryByPayee[]>([]);
  const [monthlySummary, setMonthlySummary] = useState({
    monthly_total: 0,
    monthly_ice_plant_total: 0,
    yearly_total: 0,
    yearly_ice_plant_total: 0,
    thirty_day_total: 0,
    thirty_day_ice_plant_total: 0,
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'add' | 'edit' | 'view' | 'delete'>('add');
  const [viewReceiptDialogOpen, setViewReceiptDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState(initialExpenseFormData);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter state
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [payeeFilter, setPayeeFilter] = useState<string>('all');
  const [showApprovedOnly, setShowApprovedOnly] = useState<boolean>(false);
  
  const { enqueueSnackbar } = useSnackbar();
  
  // Replace usePermissions with simple hardcoded check based on isAdmin from AuthContext
  // const { hasPermission } = usePermissions();
  
  // Replace hasPermission calls with isAdmin check
  const canAddExpense = isAdmin; // Previously: hasPermission('expenses_add')
  const canEditExpense = isAdmin; // Previously: hasPermission('expenses_edit')
  const canDeleteExpense = isAdmin; // Previously: hasPermission('expenses_delete')
  const canApproveExpense = isAdmin; // Previously: hasPermission('expenses_approve')
  
  // Fetch expenses with pagination
  const fetchExpenses = async (page = 1) => {
    try {
      setIsLoading(true);
      
      // Build URL with pagination and any active filters
      let url = `${endpoints.expenses}?page=${page}&page_size=${itemsPerPage}`;
      
      // Add date filters if active
      if (dateRange.startDate) {
        const formattedStartDate = format(dateRange.startDate, 'yyyy-MM-dd');
        url += `&date__gte=${formattedStartDate}`;
      }
      
      if (dateRange.endDate) {
        const formattedEndDate = format(dateRange.endDate, 'yyyy-MM-dd');
        url += `&date__lte=${formattedEndDate}`;
      }
      
      // Add category filter if active
      if (categoryFilter !== 'all') {
        url += `&category=${categoryFilter}`;
      }
      
      // Add payee filter if active
      if (payeeFilter !== 'all') {
        url += `&payee=${payeeFilter}`;
      }
      
      // Add approved filter if active
      if (showApprovedOnly) {
        url += `&approved=true`;
      }
      
      const response = await apiService.get(url);
      
      // Check if response has pagination info
      if (response && typeof response === 'object') {
        if (response.results && Array.isArray(response.results)) {
          setExpenses(response.results);
          // For filtered results, use the same result set
          setFilteredExpenses(response.results);
          
          // Set pagination info
          if (response.count !== undefined) {
            setTotalItems(response.count);
            setTotalPages(Math.ceil(response.count / itemsPerPage));
          }
        } else if (Array.isArray(response)) {
          // Fallback for non-paginated API
          setExpenses(response);
          setFilteredExpenses(response);
          setTotalItems(response.length);
          setTotalPages(Math.ceil(response.length / itemsPerPage));
        }
      } else {
        console.error('Unexpected API response format:', response);
        setExpenses([]);
        setFilteredExpenses([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      enqueueSnackbar('Failed to load expenses', { variant: 'error' });
      setExpenses([]);
      setFilteredExpenses([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle page change
  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    // fetchExpenses will be called via useEffect when currentPage changes
  };
  
  // Fetch expense categories
  const fetchCategories = async () => {
    try {
      const response = await apiService.get(endpoints.expenseCategories);
      const categoriesData = Array.isArray(response) ? response : 
                           response.results ? response.results : [];
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  
  // Fetch summary data
  const fetchSummaries = async () => {
    try {
      // Fetch total summary
      const totalData = await apiService.get(`${endpoints.expenses}total/`);
      setMonthlySummary(totalData);
      
      // Fetch category summary
      const categoryResponse = await apiService.get(`${endpoints.expenses}summary/?group_by=category`);
      const categorySummary = Array.isArray(categoryResponse) ? categoryResponse :
                             categoryResponse.results ? categoryResponse.results : [];
      console.log('Category summary structure:', categorySummary);
      setSummaryCategoryData(categorySummary);
      
      // Fetch monthly summary
      const monthResponse = await apiService.get(`${endpoints.expenses}summary/?group_by=month`);
      const monthSummary = Array.isArray(monthResponse) ? monthResponse :
                          monthResponse.results ? monthResponse.results : [];
      console.log('Month summary structure:', monthSummary);
      setSummaryMonthData(monthSummary);
      
      // Fetch payee summary
      const payeeResponse = await apiService.get(`${endpoints.expenses}payee_summary/`);
      const payeeSummary = Array.isArray(payeeResponse) ? payeeResponse :
                          payeeResponse.results ? payeeResponse.results : [];
      console.log('Payee summary structure:', payeeSummary);
      setSummaryPayeeData(payeeSummary);
    } catch (error) {
      console.error('Error fetching summaries:', error);
      enqueueSnackbar('Failed to load expense summaries', { variant: 'error' });
    }
  };
  
  // Modify useEffect to include dependencies properly
  useEffect(() => {
    fetchExpenses(currentPage);
  }, [currentPage, dateRange.startDate, dateRange.endDate, categoryFilter, payeeFilter, showApprovedOnly]);
  
  // Separate useEffect for initial data loading
  useEffect(() => {
    fetchCategories();
    fetchSummaries();
  }, []);
  
  // Apply client-side filters for search only
  useEffect(() => {
    if (searchQuery) {
      applySearchFilter();
    } else {
      // If no search query, use the expenses from the API directly
      setFilteredExpenses(expenses);
    }
  }, [searchQuery, expenses]);
  
  // Apply search filter (client-side only)
  const applySearchFilter = () => {
    if (!Array.isArray(expenses)) {
      console.warn('Expenses is not an array', expenses);
      setFilteredExpenses([]);
      return;
    }
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = expenses.filter(
        expense => 
          expense.description.toLowerCase().includes(query) ||
          expense.payee.toLowerCase().includes(query) ||
          (expense.reference_number && expense.reference_number.toLowerCase().includes(query)) ||
          (expense.notes && expense.notes.toLowerCase().includes(query))
      );
      setFilteredExpenses(filtered);
    } else {
      setFilteredExpenses(expenses);
    }
  };
  
  // Apply filters
  const applyFilters = () => {
    // Reset to page 1 when filters change
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      // If already on page 1, fetch with the current filters
      fetchExpenses(1);
    }
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Open dialog for adding/editing expenses
  const handleOpenDialog = (type: 'add' | 'edit' | 'view' | 'delete', expense?: Expense) => {
    setDialogType(type);
    
    if (type === 'add') {
      setFormData({
        ...initialExpenseFormData,
        date: getCurrentDateString(),
      });
    } else if (expense) {
      setSelectedExpense(expense);
      setFormData({
        date: expense.date,
        payee: expense.payee,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        reference_number: expense.reference_number || '',
        payment_method: expense.payment_method,
        ice_plant_allocation: expense.ice_plant_allocation,
        notes: expense.notes || '',
      });
    }
    
    setDialogOpen(true);
  };
  
  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedExpense(null);
    setFormData(initialExpenseFormData);
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'amount' || name === 'ice_plant_allocation') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Automatically update ice_plant_allocation when amount changes
    if (name === 'amount') {
      setFormData(prev => ({
        ...prev,
        ice_plant_allocation: parseFloat(value) || 0,
      }));
    }
  };
  
  // Handle date change
  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Format as YYYY-MM-DD without any time information
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      setFormData(prev => ({
        ...prev,
        date: formattedDate,
      }));
    }
  };
  
  // Create new expense
  const handleAddExpense = async () => {
    try {
      setIsLoading(true);
      // Ensure the date is properly formatted as YYYY-MM-DD
      const expenseData = {
        ...formData,
        date: formData.date.substring(0, 10) // Ensure only YYYY-MM-DD is sent
      };
      
      const response = await apiService.post(endpoints.expenses, expenseData);
      enqueueSnackbar('Expense added successfully', { variant: 'success' });
      
      // Refresh data
      await fetchExpenses();
      await fetchSummaries();
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error adding expense:', error);
      enqueueSnackbar('Failed to add expense', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update existing expense
  const handleUpdateExpense = async () => {
    if (!selectedExpense) return;
    
    try {
      setIsLoading(true);
      // Ensure the date is properly formatted as YYYY-MM-DD
      const expenseData = {
        ...formData,
        date: formData.date.substring(0, 10) // Ensure only YYYY-MM-DD is sent
      };
      
      const response = await apiService.put(`${endpoints.expenses}${selectedExpense.id}/`, expenseData);
      enqueueSnackbar('Expense updated successfully', { variant: 'success' });
      
      // Refresh data
      await fetchExpenses();
      await fetchSummaries();
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error updating expense:', error);
      enqueueSnackbar('Failed to update expense', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete expense
  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    
    try {
      setIsLoading(true);
      await apiService.delete(`${endpoints.expenses}${selectedExpense.id}/`);
      enqueueSnackbar('Expense deleted successfully', { variant: 'success' });
      
      // Refresh data
      await fetchExpenses();
      await fetchSummaries();
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error deleting expense:', error);
      enqueueSnackbar('Failed to delete expense', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Approve expense
  const handleApproveExpense = async (expense: Expense) => {
    try {
      setIsLoading(true);
      await apiService.post(`${endpoints.expenses}${expense.id}/approve/`, {});
      enqueueSnackbar('Expense approved successfully', { variant: 'success' });
      
      // Refresh data
      await fetchExpenses();
      await fetchSummaries();
    } catch (error) {
      console.error('Error approving expense:', error);
      enqueueSnackbar('Failed to approve expense', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle apply filters (update to reset page)
  const handleApplyFilters = () => {
    setFilterDialogOpen(false);
    applyFilters();
  };
  
  // Handle reset filters (update to reset page)
  const handleResetFilters = () => {
    setDateRange({
      startDate: null,
      endDate: null,
    });
    setCategoryFilter('all');
    setPayeeFilter('all');
    setShowApprovedOnly(false);
    
    // Reset to page 1 and fetch without filters
    setCurrentPage(1);
    // Will trigger fetchExpenses via useEffect since currentPage changed
  };
  
  // Build unique list of payees for filtering
  const uniquePayees = Array.isArray(expenses) 
    ? Array.from(new Set(expenses.map(expense => expense.payee))).sort()
    : [];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Expense Management
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            startIcon={<FilterListIcon />} 
            sx={{ mr: 1 }}
            onClick={() => setFilterDialogOpen(true)}
          >
            Filters
          </Button>
          {canAddExpense ? (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog('add')}
            >
              Add Expense
            </Button>
          ) : (
            <Tooltip title="You don't have permission to add expenses">
              <span>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<AddIcon />}
                  disabled
                >
                  Add Expense
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard 
            title="Current Month" 
            total={monthlySummary.monthly_total}
            icePlantTotal={monthlySummary.monthly_ice_plant_total}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard 
            title="Last 30 Days" 
            total={monthlySummary.thirty_day_total}
            icePlantTotal={monthlySummary.thirty_day_ice_plant_total}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard 
            title="This Year" 
            total={monthlySummary.yearly_total}
            icePlantTotal={monthlySummary.yearly_ice_plant_total}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard 
            title="Filtered Total" 
            total={filteredExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)}
            icePlantTotal={filteredExpenses.reduce((sum, expense) => sum + (Number(expense.ice_plant_allocation) || 0), 0)}
            count={filteredExpenses.length}
          />
        </Grid>
      </Grid>

      {/* Search Field */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search expenses by description, payee, reference number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Tabs for different views */}
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="expense tabs">
            <Tab label="Expenses" {...a11yProps(0)} />
            <Tab label="Categories" {...a11yProps(1)} />
            <Tab label="Monthly" {...a11yProps(2)} />
            <Tab label="Payees" {...a11yProps(3)} />
          </Tabs>
        </Box>

        {/* Expenses Tab */}
        <TabPanel value={tabValue} index={0}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Payee</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Ice Plant</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Reference #</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(Array.isArray(filteredExpenses) && filteredExpenses.length > 0) ? (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.date_formatted || format(parseISO(expense.date), 'MM/dd/yy')}</TableCell>
                        <TableCell>{expense.payee}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>{formatCurrency(expense.amount)}</TableCell>
                        <TableCell>{formatCurrency(expense.ice_plant_allocation)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={expense.category_display} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                        </TableCell>
                        <TableCell>{expense.reference_number || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={expense.approved ? 'Approved' : 'Pending'} 
                            size="small" 
                            color={expense.approved ? 'success' : 'warning'} 
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View">
                            <IconButton size="small" onClick={() => handleOpenDialog('view', expense)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          {canEditExpense ? (
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleOpenDialog('edit', expense)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                          
                          {canDeleteExpense ? (
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleOpenDialog('delete', expense)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                          
                          {canApproveExpense && !expense.approved ? (
                            <Tooltip title="Approve">
                              <IconButton size="small" color="success" onClick={() => handleApproveExpense(expense)}>
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                          
                          {!canEditExpense && !canDeleteExpense && !canApproveExpense ? (
                            <Tooltip title="You don't have permission to modify expenses">
                              <span>
                                <IconButton size="small" disabled>
                                  <LockIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {!isLoading && totalPages > 1 && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    p: 2,
                    '& .MuiPagination-ul': {
                      justifyContent: 'center',
                    },
                  }}
                >
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </TableContainer>
          )}
        </TabPanel>

        {/* Categories Tab */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Total Amount</TableCell>
                  <TableCell>Ice Plant Amount</TableCell>
                  <TableCell>Count</TableCell>
                  <TableCell>Percentage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summaryCategoryData.length > 0 ? (
                  summaryCategoryData.map((category, index) => {
                    const totalExpenses = summaryCategoryData.reduce((sum, cat) => sum + cat.total, 0);
                    const percentage = (category.total / totalExpenses) * 100;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>{category.category}</TableCell>
                        <TableCell>{formatCurrency(category.total)}</TableCell>
                        <TableCell>{formatCurrency(category.ice_plant_total)}</TableCell>
                        <TableCell>{category.count}</TableCell>
                        <TableCell>{percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No category data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Monthly Tab */}
        <TabPanel value={tabValue} index={2}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Month</TableCell>
                  <TableCell>Total Amount</TableCell>
                  <TableCell>Ice Plant Amount</TableCell>
                  <TableCell>Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summaryMonthData.length > 0 ? (
                  summaryMonthData.map((month, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {month.period ? format(new Date(month.period), 'MMMM yyyy') : 'Unknown'}
                      </TableCell>
                      <TableCell>{formatCurrency(month.total)}</TableCell>
                      <TableCell>{formatCurrency(month.ice_plant_total)}</TableCell>
                      <TableCell>{month.count}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No monthly data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Payees Tab */}
        <TabPanel value={tabValue} index={3}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Payee</TableCell>
                  <TableCell>Total Amount</TableCell>
                  <TableCell>Ice Plant Amount</TableCell>
                  <TableCell>Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summaryPayeeData.length > 0 ? (
                  summaryPayeeData.map((payee, index) => (
                    <TableRow key={index}>
                      <TableCell>{payee.payee}</TableCell>
                      <TableCell>{formatCurrency(payee.total)}</TableCell>
                      <TableCell>{formatCurrency(payee.ice_plant_total)}</TableCell>
                      <TableCell>{payee.count}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No payee data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Add/Edit Expense Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogType === 'add' ? 'Add Expense' : 
           dialogType === 'edit' ? 'Edit Expense' : 
           dialogType === 'view' ? 'View Expense' :
           'Delete Expense'}
           {!canEditExpense && dialogType !== 'view' && (
             <Chip
               label="Admin Only"
               color="error"
               size="small"
               icon={<LockIcon />}
               sx={{ ml: 2 }}
             />
           )}
        </DialogTitle>
        <DialogContent>
          {dialogType === 'delete' ? (
            <>
              <Typography gutterBottom>
                Are you sure you want to delete this expense? This action cannot be undone.
              </Typography>
              {!canDeleteExpense && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  You do not have permission to perform this action.
                </Alert>
              )}
            </>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {!canEditExpense && dialogType !== 'view' && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    You don't have permission to modify expenses.
                  </Alert>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker 
                    label="Date"
                    value={formData.date ? new Date(formData.date) : null}
                    onChange={handleDateChange}
                    disabled={dialogType === 'view' || !canEditExpense}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        variant: 'outlined',
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="payee"
                  label="Payee"
                  value={formData.payee}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={dialogType === 'view' || !canEditExpense}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="description"
                  label="Description"
                  value={formData.description}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={2}
                  disabled={dialogType === 'view' || !canEditExpense}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="amount"
                  label="Amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={dialogType === 'view' || !canEditExpense}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="ice_plant_allocation"
                  label="Ice Plant Allocation"
                  type="number"
                  value={formData.ice_plant_allocation}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={dialogType === 'view' || !canEditExpense}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="category"
                  label="Category"
                  select
                  value={formData.category}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={dialogType === 'view' || !canEditExpense}
                  required
                >
                  <MenuItem value="meals">Meals</MenuItem>
                  <MenuItem value="utilities">Utilities</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="salaries">Salaries</MenuItem>
                  <MenuItem value="payroll">Payroll</MenuItem>
                  <MenuItem value="raw_materials">Raw Materials</MenuItem>
                  <MenuItem value="equipment">Equipment</MenuItem>
                  <MenuItem value="transportation">Transportation</MenuItem>
                  <MenuItem value="taxes">Taxes</MenuItem>
                  <MenuItem value="permits">Permits & Licenses</MenuItem>
                  <MenuItem value="electricity">Electricity</MenuItem>
                  <MenuItem value="bonus">Bonus</MenuItem>
                  <MenuItem value="ice_delivery">Ice Delivery</MenuItem>
                  <MenuItem value="ice_plant">Ice Plant</MenuItem>
                  <MenuItem value="miscellaneous">Miscellaneous</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  name="payment_method"
                  label="Payment Method"
                  select
                  value={formData.payment_method}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={dialogType === 'view' || !canEditExpense}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="check">Check</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                  <MenuItem value="debit_card">Debit Card</MenuItem>
                  <MenuItem value="mobile_payment">Mobile Payment</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="reference_number"
                  label="Reference Number"
                  value={formData.reference_number}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={dialogType === 'view' || !canEditExpense}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="notes"
                  label="Notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={3}
                  disabled={dialogType === 'view' || !canEditExpense}
                />
              </Grid>
              
              {dialogType === 'view' && selectedExpense && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom>Additional Information</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2">
                      <strong>Created:</strong> {selectedExpense.created_at_formatted}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2">
                      <strong>Last Updated:</strong> {selectedExpense.updated_at_formatted}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2">
                      <strong>Created By:</strong> {selectedExpense.created_by_details?.username || 'Unknown'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" component="div">
                      <strong>Approval Status:</strong> {' '}
                      <Chip 
                        label={selectedExpense.approved ? 'Approved' : 'Pending'} 
                        size="small" 
                        color={selectedExpense.approved ? 'success' : 'warning'} 
                      />
                    </Typography>
                  </Grid>
                  {selectedExpense.approved && (
                    <>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2">
                          <strong>Approved By:</strong> {selectedExpense.approved_by_details?.username || 'Unknown'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2">
                          <strong>Approved Date:</strong> {selectedExpense.approved_date_formatted}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {dialogType === 'view' ? 'Close' : 'Cancel'}
          </Button>
          
          {dialogType === 'add' && canAddExpense && (
            <Button 
              onClick={handleAddExpense} 
              variant="contained" 
              color="primary"
              disabled={isLoading || !formData.payee || !formData.description}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Save'}
            </Button>
          )}
          
          {dialogType === 'edit' && canEditExpense && (
            <Button 
              onClick={handleUpdateExpense} 
              variant="contained" 
              color="primary"
              disabled={isLoading || !formData.payee || !formData.description}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Update'}
            </Button>
          )}
          
          {dialogType === 'delete' && canDeleteExpense && (
            <Button 
              onClick={handleDeleteExpense} 
              variant="contained" 
              color="error"
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Delete'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog 
        open={filterDialogOpen} 
        onClose={() => setFilterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Filter Expenses</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker 
                  label="Start Date"
                  value={dateRange.startDate}
                  onChange={(date) => setDateRange(prev => ({ ...prev, startDate: date }))}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: 'outlined',
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker 
                  label="End Date"
                  value={dateRange.endDate}
                  onChange={(date) => setDateRange(prev => ({ ...prev, endDate: date }))}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: 'outlined',
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Category"
                select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                fullWidth
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="meals">Meals</MenuItem>
                <MenuItem value="utilities">Utilities</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="salaries">Salaries</MenuItem>
                <MenuItem value="payroll">Payroll</MenuItem>
                <MenuItem value="raw_materials">Raw Materials</MenuItem>
                <MenuItem value="equipment">Equipment</MenuItem>
                <MenuItem value="transportation">Transportation</MenuItem>
                <MenuItem value="taxes">Taxes</MenuItem>
                <MenuItem value="permits">Permits & Licenses</MenuItem>
                <MenuItem value="electricity">Electricity</MenuItem>
                <MenuItem value="bonus">Bonus</MenuItem>
                <MenuItem value="ice_delivery">Ice Delivery</MenuItem>
                <MenuItem value="ice_plant">Ice Plant</MenuItem>
                <MenuItem value="miscellaneous">Miscellaneous</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Payee"
                select
                value={payeeFilter}
                onChange={(e) => setPayeeFilter(e.target.value)}
                fullWidth
              >
                <MenuItem value="all">All Payees</MenuItem>
                {Array.isArray(uniquePayees) && uniquePayees.map((payee, index) => (
                  <MenuItem key={index} value={payee}>{payee}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={showApprovedOnly} 
                    onChange={(e) => setShowApprovedOnly(e.target.checked)} 
                  />
                }
                label="Show Approved Only"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetFilters}>Reset</Button>
          <Button onClick={handleApplyFilters} variant="contained" color="primary">
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ExpensesPage;
