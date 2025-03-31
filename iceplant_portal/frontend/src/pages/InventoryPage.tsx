import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import { apiService, endpoints } from '../services/api';
import { useSnackbar } from 'notistack';

interface InventoryItem {
  id: number;
  item_name: string;
  quantity: number;
  unit: string;
  minimum_level: number;
  last_updated: string;
  created_at: string;
  is_low: boolean;
}

interface InventoryAdjustment {
  id: number;
  inventory: number;
  inventory_name: string;
  previous_quantity: number;
  new_quantity: number;
  adjustment_amount: number;
  adjustment_date: string;
  reason: string;
  adjusted_by: string;
}

enum ModalType {
  ADD,
  EDIT,
  ADJUST,
  HISTORY,
  DELETE
}

const unitOptions = [
  'kg', 'liter', 'unit', 'piece', 'bottle', 'pack', 'box', 'bag', 'ton'
];

const InventoryPage = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const [adjustmentHistory, setAdjustmentHistory] = useState<InventoryAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(ModalType.ADD);
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: 0,
    unit: 'unit',
    minimum_level: 10,
    reason: '',
    new_quantity: 0
  });
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.get(endpoints.inventory);
      setInventoryItems(data);
    } catch (error) {
      enqueueSnackbar('Failed to load inventory', { variant: 'error' });
      console.error('Error fetching inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventoryHistory = async (inventoryId: number) => {
    try {
      setIsLoading(true);
      const data = await apiService.get(`${endpoints.inventoryAdjustments}history/?inventory_id=${inventoryId}`);
      setAdjustmentHistory(data);
    } catch (error) {
      enqueueSnackbar('Failed to load adjustment history', { variant: 'error' });
      console.error('Error fetching adjustment history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (type: ModalType, item?: InventoryItem) => {
    setModalType(type);
    
    if (item) {
      setCurrentItem(item);
      
      if (type === ModalType.EDIT) {
        setFormData({
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          minimum_level: item.minimum_level,
          reason: '',
          new_quantity: item.quantity
        });
      } else if (type === ModalType.ADJUST) {
        setFormData({
          ...formData,
          new_quantity: item.quantity,
          reason: ''
        });
      } else if (type === ModalType.HISTORY) {
        fetchInventoryHistory(item.id);
      }
    } else {
      setCurrentItem(null);
      setFormData({
        item_name: '',
        quantity: 0,
        unit: 'unit',
        minimum_level: 10,
        reason: '',
        new_quantity: 0
      });
    }
    
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentItem(null);
    setAdjustmentHistory([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Convert numeric fields
    if (['quantity', 'minimum_level', 'new_quantity'].includes(name)) {
      setFormData({
        ...formData,
        [name]: parseInt(value, 10) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleAddItem = async () => {
    try {
      setIsLoading(true);
      await apiService.post(endpoints.inventory, {
        item_name: formData.item_name,
        quantity: formData.quantity,
        unit: formData.unit,
        minimum_level: formData.minimum_level
      });
      
      enqueueSnackbar('Inventory item added successfully', { variant: 'success' });
      handleCloseModal();
      fetchInventory();
    } catch (error) {
      enqueueSnackbar('Failed to add inventory item', { variant: 'error' });
      console.error('Error adding inventory item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = async () => {
    if (!currentItem) return;
    
    try {
      setIsLoading(true);
      await apiService.put(`${endpoints.inventory}${currentItem.id}/`, {
        item_name: formData.item_name,
        quantity: formData.quantity,
        unit: formData.unit,
        minimum_level: formData.minimum_level
      });
      
      enqueueSnackbar('Inventory item updated successfully', { variant: 'success' });
      handleCloseModal();
      fetchInventory();
    } catch (error) {
      enqueueSnackbar('Failed to update inventory item', { variant: 'error' });
      console.error('Error updating inventory item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustQuantity = async () => {
    if (!currentItem) return;
    
    try {
      setIsLoading(true);
      await apiService.post(endpoints.inventoryAdjustments, {
        inventory: currentItem.id,
        new_quantity: formData.new_quantity,
        reason: formData.reason,
        adjusted_by: localStorage.getItem('username') || 'system'
      });
      
      enqueueSnackbar('Inventory quantity adjusted successfully', { variant: 'success' });
      handleCloseModal();
      fetchInventory();
    } catch (error) {
      enqueueSnackbar('Failed to adjust inventory quantity', { variant: 'error' });
      console.error('Error adjusting inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!currentItem) return;
    
    try {
      setIsLoading(true);
      await apiService.delete(`${endpoints.inventory}${currentItem.id}/`);
      
      enqueueSnackbar('Inventory item deleted successfully', { variant: 'success' });
      handleCloseModal();
      fetchInventory();
    } catch (error) {
      enqueueSnackbar('Failed to delete inventory item', { variant: 'error' });
      console.error('Error deleting inventory item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderModalContent = () => {
    switch (modalType) {
      case ModalType.ADD:
        return (
          <>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogContent>
              <TextField
                name="item_name"
                label="Item Name"
                value={formData.item_name}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
              />
              <TextField
                name="quantity"
                label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
                InputProps={{ inputProps: { min: 0 } }}
              />
              <TextField
                name="unit"
                select
                label="Unit"
                value={formData.unit}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              >
                {unitOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                name="minimum_level"
                label="Minimum Level"
                type="number"
                value={formData.minimum_level}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                helperText="Minimum level before low stock alert"
                InputProps={{ inputProps: { min: 0 } }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button 
                onClick={handleAddItem} 
                variant="contained" 
                color="primary" 
                disabled={!formData.item_name || isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : "Add Item"}
              </Button>
            </DialogActions>
          </>
        );
      
      case ModalType.EDIT:
        return (
          <>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogContent>
              <TextField
                name="item_name"
                label="Item Name"
                value={formData.item_name}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
              />
              <TextField
                name="quantity"
                label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
                InputProps={{ inputProps: { min: 0 } }}
              />
              <TextField
                name="unit"
                select
                label="Unit"
                value={formData.unit}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              >
                {unitOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                name="minimum_level"
                label="Minimum Level"
                type="number"
                value={formData.minimum_level}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                helperText="Minimum level before low stock alert"
                InputProps={{ inputProps: { min: 0 } }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button 
                onClick={handleEditItem} 
                variant="contained" 
                color="primary" 
                disabled={!formData.item_name || isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : "Save Changes"}
              </Button>
            </DialogActions>
          </>
        );
      
      case ModalType.ADJUST:
        return (
          <>
            <DialogTitle>Adjust Inventory</DialogTitle>
            <DialogContent>
              <Typography variant="subtitle1">
                {currentItem?.item_name} - Current Quantity: {currentItem?.quantity} {currentItem?.unit}
              </Typography>
              <TextField
                name="new_quantity"
                label="New Quantity"
                type="number"
                value={formData.new_quantity}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
                InputProps={{ inputProps: { min: 0 } }}
              />
              <TextField
                name="reason"
                label="Reason for Adjustment"
                value={formData.reason}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
                multiline
                rows={3}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button 
                onClick={handleAdjustQuantity} 
                variant="contained" 
                color="primary" 
                disabled={!formData.reason || isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : "Save Adjustment"}
              </Button>
            </DialogActions>
          </>
        );
      
      case ModalType.HISTORY:
        return (
          <>
            <DialogTitle>Adjustment History - {currentItem?.item_name}</DialogTitle>
            <DialogContent>
              {isLoading ? (
                <Box display="flex" justifyContent="center" my={3}>
                  <CircularProgress />
                </Box>
              ) : adjustmentHistory.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Before</TableCell>
                        <TableCell>After</TableCell>
                        <TableCell>Change</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Adjusted By</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {adjustmentHistory.map((adjustment) => (
                        <TableRow key={adjustment.id}>
                          <TableCell>
                            {new Date(adjustment.adjustment_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{adjustment.previous_quantity}</TableCell>
                          <TableCell>{adjustment.new_quantity}</TableCell>
                          <TableCell>
                            <Chip 
                              label={`${adjustment.adjustment_amount > 0 ? '+' : ''}${adjustment.adjustment_amount}`}
                              color={adjustment.adjustment_amount >= 0 ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{adjustment.reason}</TableCell>
                          <TableCell>{adjustment.adjusted_by}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No adjustment history found</Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal}>Close</Button>
            </DialogActions>
          </>
        );
      
      case ModalType.DELETE:
        return (
          <>
            <DialogTitle>Delete Inventory Item</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete "{currentItem?.item_name}"? This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button 
                onClick={handleDeleteItem} 
                variant="contained" 
                color="error" 
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : "Delete"}
              </Button>
            </DialogActions>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Inventory Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenModal(ModalType.ADD)}
        >
          Add Item
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Low Stock Items
        </Typography>
        {isLoading ? (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item Name</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Minimum Level</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventoryItems.filter(item => item.is_low).length > 0 ? (
                  inventoryItems
                    .filter(item => item.is_low)
                    .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography fontWeight="bold">
                            {item.item_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`${item.quantity} ${item.unit}`}
                            color="error"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{item.minimum_level} {item.unit}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => handleOpenModal(ModalType.ADJUST, item)}
                          >
                            Adjust Stock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Alert severity="success">
                        All inventory items are above minimum levels
                      </Alert>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          All Inventory Items
        </Typography>
        {isLoading ? (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item Name</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Minimum Level</TableCell>
                  <TableCell>Last Updated</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventoryItems.length > 0 ? (
                  inventoryItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={item.quantity}
                          color={item.is_low ? "error" : "success"}
                          variant={item.is_low ? "filled" : "outlined"}
                        />
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.minimum_level}</TableCell>
                      <TableCell>
                        {new Date(item.last_updated).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Grid container spacing={1}>
                          <Grid item>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleOpenModal(ModalType.EDIT, item)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Grid>
                          <Grid item>
                            <IconButton 
                              size="small" 
                              color="secondary"
                              onClick={() => handleOpenModal(ModalType.ADJUST, item)}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Grid>
                          <Grid item>
                            <IconButton 
                              size="small" 
                              color="info"
                              onClick={() => handleOpenModal(ModalType.HISTORY, item)}
                            >
                              <HistoryIcon fontSize="small" />
                            </IconButton>
                          </Grid>
                          <Grid item>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleOpenModal(ModalType.DELETE, item)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Alert severity="info">
                        No inventory items found. Add your first inventory item.
                      </Alert>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth={modalType === ModalType.HISTORY}>
        {renderModalContent()}
      </Dialog>
    </Container>
  );
};

export default InventoryPage; 