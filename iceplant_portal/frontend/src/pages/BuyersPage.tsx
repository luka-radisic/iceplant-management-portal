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
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Pagination,
  Stack,
  FormControlLabel,
  Switch,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { apiService } from '../services/api';
import { Buyer } from '../types/buyers';
import { useAuth } from '../contexts/AuthContext';
import { styled } from '@mui/material/styles';

const BuyersPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin } = useAuth();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [filteredBuyers, setFilteredBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentBuyer, setCurrentBuyer] = useState<Buyer | null>(null);

  // Form data
  const initialFormData = {
    name: '',
    company_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    tax_id: '',
    business_type: '',
    notes: '',
    is_active: true,
  };
  
  const [formData, setFormData] = useState(initialFormData);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalBuyers, setTotalBuyers] = useState(0);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  
  // Calculate colSpan based on admin status
  const tableColSpan = isAdmin ? 7 : 6;
  
  // Fetch buyers data
  const fetchBuyers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getBuyers();
      if (Array.isArray(response)) {
        setBuyers(response);
        setFilteredBuyers(response);
        setTotalBuyers(response.length);
      } else if (response && response.results) {
        setBuyers(response.results);
        setFilteredBuyers(response.results);
        setTotalBuyers(response.count || response.results.length);
      } else {
        setBuyers([]);
        setFilteredBuyers([]);
        setTotalBuyers(0);
      }
    } catch (err) {
      console.error('Error fetching buyers:', err);
      setError('Failed to load buyers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchBuyers();
  }, [fetchBuyers]);
  
  // Apply filters
  useEffect(() => {
    let filtered = [...buyers];
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      // Check if the query might be a UUID (approximately)
      const mightBeUuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(searchQuery);
      
      filtered = filtered.filter(buyer => 
        buyer.name.toLowerCase().includes(query) ||
        (buyer.company_name && buyer.company_name.toLowerCase().includes(query)) ||
        (buyer.email && buyer.email.toLowerCase().includes(query)) ||
        (buyer.phone && buyer.phone.toLowerCase().includes(query)) ||
        // If search looks like a UUID, also search by ID
        (mightBeUuid && buyer.id.toLowerCase().includes(query))
      );
    }
    
    // Apply active/inactive filter
    if (!showInactive) {
      filtered = filtered.filter(buyer => buyer.is_active);
    }
    
    // Apply pagination
    setFilteredBuyers(filtered);
    setTotalBuyers(filtered.length);
  }, [buyers, searchQuery, showInactive, page, pageSize]);
  
  // Pagination calculation
  const paginatedBuyers = filteredBuyers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Dialog Handlers
  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setOpenCreateDialog(true);
  };
  
  const handleOpenEdit = (buyer: Buyer) => {
    setCurrentBuyer(buyer);
    setFormData({
      name: buyer.name,
      company_name: buyer.company_name || '',
      email: buyer.email || '',
      phone: buyer.phone || '',
      address: buyer.address || '',
      city: buyer.city || '',
      state: buyer.state || '',
      postal_code: buyer.postal_code || '',
      tax_id: buyer.tax_id || '',
      business_type: buyer.business_type || '',
      notes: buyer.notes || '',
      is_active: buyer.is_active,
    });
    setOpenEditDialog(true);
  };
  
  const handleOpenDelete = (buyer: Buyer) => {
    setCurrentBuyer(buyer);
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDialogs = () => {
    setOpenCreateDialog(false);
    setOpenEditDialog(false);
    setOpenDeleteDialog(false);
    setCurrentBuyer(null);
    setFormData(initialFormData);
  };
  
  // Form Handlers
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  
  const handleCreateBuyer = async () => {
    try {
      await apiService.createBuyer(formData);
      enqueueSnackbar('Buyer created successfully', { variant: 'success' });
      handleCloseDialogs();
      fetchBuyers();
    } catch (err) {
      console.error('Error creating buyer:', err);
      enqueueSnackbar('Failed to create buyer', { variant: 'error' });
    }
  };
  
  const handleUpdateBuyer = async () => {
    if (!currentBuyer) return;
    
    try {
      await apiService.updateBuyer(currentBuyer.id, formData);
      enqueueSnackbar('Buyer updated successfully', { variant: 'success' });
      handleCloseDialogs();
      fetchBuyers();
    } catch (err) {
      console.error('Error updating buyer:', err);
      enqueueSnackbar('Failed to update buyer', { variant: 'error' });
    }
  };
  
  const handleDeleteBuyer = async () => {
    if (!currentBuyer) return;
    
    try {
      // Instead of deleting, just mark as inactive
      await apiService.updateBuyer(currentBuyer.id, { is_active: false });
      enqueueSnackbar('Buyer marked as inactive', { variant: 'success' });
      handleCloseDialogs();
      fetchBuyers();
    } catch (err) {
      console.error('Error deactivating buyer:', err);
      enqueueSnackbar('Failed to deactivate buyer', { variant: 'error' });
    }
  };
  
  // Pagination Handler
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  // Search Handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page when searching
  };
  
  // Render buyers table
  const renderBuyersTable = () => {
    return (
      <>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                {isAdmin && <TableCell>Buyer ID</TableCell>}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={tableColSpan} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={tableColSpan} align="center">
                    <Alert severity="error" sx={{ width: '100%', justifyContent: 'center' }}>{error}</Alert>
                  </TableCell>
                </TableRow>
              ) : filteredBuyers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableColSpan} align="center">
                    No buyers found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBuyers.map((buyer, index) => (
                  <TableRow
                    key={buyer.id}
                    hover
                    sx={{
                      '&:nth-of-type(odd)': {
                        backgroundColor: (theme) => theme.palette.action.hover,
                      },
                    }}
                  >
                    <TableCell>{buyer.name}</TableCell>
                    <TableCell>{buyer.company_name || '-'}</TableCell>
                    <TableCell>
                      <Stack>
                        {buyer.email && <Typography variant="body2">{buyer.email}</Typography>}
                        {buyer.phone && <Typography variant="body2">{buyer.phone}</Typography>}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {buyer.city && buyer.state ? `${buyer.city}, ${buyer.state}` : (buyer.city || buyer.state || '-')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={buyer.is_active ? 'Active' : 'Inactive'}
                        color={buyer.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {buyer.id}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <IconButton size="small" color="primary" onClick={() => handleOpenEdit(buyer)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {isAdmin && (
                        <IconButton size="small" color="error" onClick={() => handleOpenDelete(buyer)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {!loading && !error && filteredBuyers.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={Math.ceil(totalBuyers / pageSize)}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </>
    );
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Buyers Management</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Search buyers..."
              variant="outlined"
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={<Switch checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />}
              label="Show inactive"
            />
          </Grid>
          <Grid item xs={12} sm={2} sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              New Buyer
            </Button>
          </Grid>
        </Grid>
        
        {renderBuyersTable()}
      </Paper>
      
      {/* Create Buyer Dialog */}
      <Dialog open={openCreateDialog} onClose={handleCloseDialogs} maxWidth="md" fullWidth>
        <DialogTitle>Create New Buyer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                required
                margin="normal"
              />
              <TextField
                fullWidth
                label="Company Name"
                name="company_name"
                value={formData.company_name}
                onChange={handleFormChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleFormChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleFormChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleFormChange}
                margin="normal"
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleFormChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleFormChange}
                  margin="normal"
                />
              </Box>
              <TextField
                fullWidth
                label="Postal Code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleFormChange}
                margin="normal"
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Tax ID"
                  name="tax_id"
                  value={formData.tax_id}
                  onChange={handleFormChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Business Type"
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleFormChange}
                  margin="normal"
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                margin="normal"
                multiline
                rows={2}
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={formData.is_active} 
                    onChange={handleFormChange} 
                    name="is_active" 
                    color="primary"
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleCreateBuyer} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Buyer Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseDialogs} maxWidth="md" fullWidth>
        <DialogTitle>Edit Buyer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {isAdmin && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Buyer ID (System Generated)"
                  value={currentBuyer?.id || ''}
                  InputProps={{ readOnly: true }}
                  margin="normal"
                  helperText="This unique identifier is used by the system to distinguish between buyers with the same name"
                  sx={{ fontFamily: 'monospace' }}
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                required
                margin="normal"
              />
              <TextField
                fullWidth
                label="Company Name"
                name="company_name"
                value={formData.company_name}
                onChange={handleFormChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleFormChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleFormChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleFormChange}
                margin="normal"
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleFormChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleFormChange}
                  margin="normal"
                />
              </Box>
              <TextField
                fullWidth
                label="Postal Code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleFormChange}
                margin="normal"
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Tax ID"
                  name="tax_id"
                  value={formData.tax_id}
                  onChange={handleFormChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Business Type"
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleFormChange}
                  margin="normal"
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                margin="normal"
                multiline
                rows={2}
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={formData.is_active} 
                    onChange={handleFormChange} 
                    name="is_active" 
                    color="primary"
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleUpdateBuyer} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDialogs}>
        <DialogTitle>Confirm Deactivation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate buyer "{currentBuyer?.name}"? This buyer will no longer
            appear in active buyers lists.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleDeleteBuyer} variant="contained" color="error">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BuyersPage; 