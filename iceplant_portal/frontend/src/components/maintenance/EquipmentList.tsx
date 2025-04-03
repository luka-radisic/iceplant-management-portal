import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Pagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Build as MaintenanceIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { 
  MaintenanceItem,
  MaintenanceRecord
} from '../../types/api';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { useSnackbar } from 'notistack';
import apiService from '../../services/api';
import { endpoints } from '../../services/endpoints';

// For equipment type and location dropdown options
const equipmentTypes = ['Compressor', 'Condenser', 'Evaporator', 'Ice Maker', 'Storage Tank', 'Pump', 'Generator', 'Cooler', 'Conveyor', 'Control System', 'Other'];
const locations = ['Main Plant', 'Storage Area', 'Production Line', 'Office', 'Delivery Vehicle', 'External Site', 'Other'];

enum ModalType {
  ADD,
  EDIT,
  DELETE,
  HISTORY
}

interface EquipmentListProps {
  // Props can be added as needed
}

const EquipmentList: React.FC<EquipmentListProps> = () => {
  const [equipment, setEquipment] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(ModalType.ADD);
  const [currentItem, setCurrentItem] = useState<MaintenanceItem | null>(null);
  const [formData, setFormData] = useState({
    equipment_name: '',
    equipment_type: '',
    model_number: '',
    serial_number: '',
    location: '',
    installation_date: '',
    maintenance_frequency: 3,
    frequency_unit: 'months',
    status: 'operational',
    notes: '',
  });
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const { enqueueSnackbar } = useSnackbar();
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(10);

  useEffect(() => {
    fetchEquipment(page);
  }, [page]);

  const fetchEquipment = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const url = `${endpoints.maintenanceItems}?page=${pageNumber}&page_size=${pageSize}`;
      const response = await apiService.get(url);
      
      if (response && typeof response === 'object') {
        // Handle paginated response format
        if (response.results) {
          setEquipment(response.results);
          setTotalItems(response.count || 0);
        } else {
          setEquipment(Array.isArray(response) ? response : []);
          setTotalItems(Array.isArray(response) ? response.length : 0);
        }
      } else {
        setEquipment([]);
        setTotalItems(0);
      }
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setError('Failed to load equipment data');
      enqueueSnackbar('Failed to load equipment data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleOpenModal = async (type: ModalType, item?: MaintenanceItem) => {
    setModalType(type);
    
    if (type === ModalType.ADD) {
      setFormData({
        equipment_name: '',
        equipment_type: '',
        model_number: '',
        serial_number: '',
        location: '',
        installation_date: '',
        maintenance_frequency: 3,
        frequency_unit: 'months',
        status: 'operational',
        notes: '',
      });
    } else if (item && (type === ModalType.EDIT || type === ModalType.DELETE)) {
      setCurrentItem(item);
      setFormData({
        equipment_name: item.equipment_name,
        equipment_type: item.equipment_type,
        model_number: item.model_number || '',
        serial_number: item.serial_number || '',
        location: item.location,
        installation_date: item.installation_date || '',
        maintenance_frequency: item.maintenance_frequency,
        frequency_unit: item.frequency_unit,
        status: item.status,
        notes: item.notes || '',
      });
    } else if (item && type === ModalType.HISTORY) {
      setCurrentItem(item);
      try {
        setLoading(true);
        // Fetch maintenance records for this equipment item
        const records = await apiService.get(`${endpoints.maintenanceRecords}?item_id=${item.id}`);
        setMaintenanceRecords(Array.isArray(records) ? records : records.results || []);
      } catch (err) {
        console.error('Error fetching maintenance records:', err);
        enqueueSnackbar('Failed to load maintenance history', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }
    
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    // Delay resetting records until transition ends
    // setMaintenanceRecords([]); 
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value,
    });
  };

  const handleAddEquipment = async () => {
    try {
      setLoading(true);
      const response = await apiService.post(endpoints.maintenanceItems, formData);
      
      // Refresh the equipment list after adding
      fetchEquipment(page);
      enqueueSnackbar('Equipment added successfully', { variant: 'success' });
      handleCloseModal();
    } catch (err) {
      console.error('Error adding equipment:', err);
      enqueueSnackbar('Failed to add equipment', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditEquipment = async () => {
    if (!currentItem) return;
    
    try {
      setLoading(true);
      await apiService.put(`${endpoints.maintenanceItems}${currentItem.id}/`, formData);
      
      // Refresh the equipment list after editing
      fetchEquipment(page);
      enqueueSnackbar('Equipment updated successfully', { variant: 'success' });
      handleCloseModal();
    } catch (err) {
      console.error('Error editing equipment:', err);
      enqueueSnackbar('Failed to update equipment', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEquipment = async () => {
    if (!currentItem) return;
    
    try {
      setLoading(true);
      await apiService.delete(`${endpoints.maintenanceItems}${currentItem.id}/`);
      
      // Refresh the equipment list after deleting
      fetchEquipment(page);
      enqueueSnackbar('Equipment deleted successfully', { variant: 'success' });
      handleCloseModal();
    } catch (err) {
      console.error('Error deleting equipment:', err);
      enqueueSnackbar('Failed to delete equipment', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!currentItem) return;
    
    try {
      setLoading(true);
      await apiService.post(endpoints.clearMaintenanceHistory(currentItem.id), {});
      
      // Clear the maintenance records
      setMaintenanceRecords([]);
      enqueueSnackbar('Maintenance history cleared successfully', { variant: 'success' });
    } catch (err) {
      console.error('Error clearing maintenance history:', err);
      enqueueSnackbar('Failed to clear maintenance history', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    let color: 'success' | 'warning' | 'info' | 'error' = 'success';
    let label = 'Operational';
    
    switch (status) {
      case 'operational':
        color = 'success';
        label = 'Operational';
        break;
      case 'requires_maintenance':
        color = 'warning';
        label = 'Requires Maintenance';
        break;
      case 'under_maintenance':
        color = 'info';
        label = 'Under Maintenance';
        break;
      case 'not_operational':
        color = 'error';
        label = 'Not Operational';
        break;
    }
    
    return <Chip label={label} color={color} size="small" />;
  };

  const renderModalContent = () => {
    switch (modalType) {
      case ModalType.ADD:
        return (
          <>
            <DialogTitle id="equipment-dialog-title">Add New Equipment</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Equipment Name"
                    name="equipment_name"
                    value={formData.equipment_name}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="equipment-type-label">Equipment Type</InputLabel>
                    <Select
                      labelId="equipment-type-label"
                      name="equipment_type"
                      value={formData.equipment_type}
                      onChange={handleInputChange}
                      label="Equipment Type"
                      required
                    >
                      {equipmentTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="location-label">Location</InputLabel>
                    <Select
                      labelId="location-label"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      label="Location"
                      required
                    >
                      {locations.map((location) => (
                        <MenuItem key={location} value={location}>
                          {location}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Model Number"
                    name="model_number"
                    value={formData.model_number}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Serial Number"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Installation Date"
                    name="installation_date"
                    value={formData.installation_date}
                    onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Maintenance Frequency"
                    name="maintenance_frequency"
                    value={formData.maintenance_frequency}
                    onChange={handleInputChange}
                    InputProps={{ inputProps: { min: 1 } }}
                    required
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel id="frequency-unit-label">Unit</InputLabel>
                    <Select
                      labelId="frequency-unit-label"
                      name="frequency_unit"
                      value={formData.frequency_unit}
                      onChange={handleInputChange}
                      label="Unit"
                      required
                    >
                      <MenuItem value="days">Days</MenuItem>
                      <MenuItem value="weeks">Weeks</MenuItem>
                      <MenuItem value="months">Months</MenuItem>
                      <MenuItem value="hours">Hours</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button 
                onClick={handleAddEquipment} 
                variant="contained" 
                color="primary"
              >
                Add Equipment
              </Button>
            </DialogActions>
          </>
        );
      
      case ModalType.EDIT:
        return (
          <>
            <DialogTitle id="equipment-dialog-title">Edit Equipment</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Equipment Name"
                    name="equipment_name"
                    value={formData.equipment_name}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="equipment-type-label">Equipment Type</InputLabel>
                    <Select
                      labelId="equipment-type-label"
                      name="equipment_type"
                      value={formData.equipment_type}
                      onChange={handleInputChange}
                      label="Equipment Type"
                      required
                    >
                      {equipmentTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="location-label">Location</InputLabel>
                    <Select
                      labelId="location-label"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      label="Location"
                      required
                    >
                      {locations.map((location) => (
                        <MenuItem key={location} value={location}>
                          {location}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Model Number"
                    name="model_number"
                    value={formData.model_number}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Serial Number"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Installation Date"
                    name="installation_date"
                    value={formData.installation_date}
                    onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Maintenance Frequency"
                    name="maintenance_frequency"
                    value={formData.maintenance_frequency}
                    onChange={handleInputChange}
                    InputProps={{ inputProps: { min: 1 } }}
                    required
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel id="frequency-unit-label">Unit</InputLabel>
                    <Select
                      labelId="frequency-unit-label"
                      name="frequency_unit"
                      value={formData.frequency_unit}
                      onChange={handleInputChange}
                      label="Unit"
                      required
                    >
                      <MenuItem value="days">Days</MenuItem>
                      <MenuItem value="weeks">Weeks</MenuItem>
                      <MenuItem value="months">Months</MenuItem>
                      <MenuItem value="hours">Hours</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button 
                onClick={handleEditEquipment} 
                variant="contained" 
                color="primary"
              >
                Update Equipment
              </Button>
            </DialogActions>
          </>
        );
      
      case ModalType.DELETE:
        return (
          <>
            <DialogTitle id="equipment-dialog-title">Delete Equipment</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete <strong>{currentItem?.equipment_name}</strong>?
                This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button 
                onClick={handleDeleteEquipment} 
                variant="contained" 
                color="error"
              >
                Delete
              </Button>
            </DialogActions>
          </>
        );
        
      case ModalType.HISTORY:
        if (!currentItem) return null;
        return (
          <>
            <DialogTitle id="equipment-dialog-title">Maintenance History: {currentItem.equipment_name}</DialogTitle>
            <DialogContent>
              {maintenanceRecords.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Performed By</TableCell>
                        <TableCell>Cost</TableCell>
                        <TableCell>Duration</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {maintenanceRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDate(record.maintenance_date)}</TableCell>
                          <TableCell>
                            <Chip 
                              size="small" 
                              label={record.maintenance_type.charAt(0).toUpperCase() + record.maintenance_type.slice(1)} 
                              color={
                                record.maintenance_type === 'scheduled' ? 'primary' :
                                record.maintenance_type === 'emergency' ? 'error' :
                                record.maintenance_type === 'preventive' ? 'success' : 'warning'
                              }
                            />
                          </TableCell>
                          <TableCell>{record.performed_by}</TableCell>
                          <TableCell>{formatCurrency(record.cost)}</TableCell>
                          <TableCell>{record.duration} hours</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body1">No maintenance records found for this equipment.</Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal}>Close</Button>
            </DialogActions>
          </>
        );
        
      default:
        return null;
    }
  };

  if (loading && equipment.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', m: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && equipment.length === 0) {
    return (
      <Box sx={{ m: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const renderPagination = () => {
    return totalItems > 0 ? (
      <Box display="flex" justifyContent="center" mt={2}>
        <Pagination 
          count={Math.ceil(totalItems / pageSize)} 
          page={page} 
          onChange={handlePageChange}
          color="primary"
        />
      </Box>
    ) : null;
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Equipment List</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenModal(ModalType.ADD)}
        >
          Add Equipment
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Last Maintenance</TableCell>
              <TableCell>Next Maintenance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {equipment.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.equipment_name}</TableCell>
                <TableCell>{item.equipment_type}</TableCell>
                <TableCell>{item.location}</TableCell>
                <TableCell>{item.last_maintenance_date ? formatDate(item.last_maintenance_date) : 'Not yet maintained'}</TableCell>
                <TableCell>{formatDate(item.next_maintenance_date)}</TableCell>
                <TableCell>{getStatusChip(item.status)}</TableCell>
                <TableCell align="center">
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleOpenModal(ModalType.EDIT, item)}
                    title="Edit"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleOpenModal(ModalType.DELETE, item)}
                    title="Delete"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="secondary"
                    onClick={() => handleOpenModal(ModalType.HISTORY, item)}
                    title="Maintenance History"
                  >
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {renderPagination()}
      
      {/* Modal */}
      <Dialog 
        open={modalOpen} 
        onClose={handleCloseModal} 
        maxWidth="md" 
        fullWidth
        // Add TransitionProps with onExited
        TransitionProps={{
          onExited: () => {
            // Reset records state *after* the dialog has fully closed
            setMaintenanceRecords([]);
            setCurrentItem(null); // Also reset current item here
          }
        }}
      >
        {renderModalContent()}
      </Dialog>
    </Box>
  );
};

export default EquipmentList; 