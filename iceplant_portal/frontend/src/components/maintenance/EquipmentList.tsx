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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Build as MaintenanceIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { 
  MaintenanceItem 
} from '../../types/api';
import { formatDate } from '../../utils/formatters';
import { 
  sampleMaintenanceItems, 
  equipmentTypes, 
  locations 
} from '../../data/sampleMaintenanceData';

enum ModalType {
  ADD,
  EDIT,
  DELETE,
  MAINTENANCE
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
    notes: '',
  });

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        setLoading(true);
        // In real implementation, we would fetch from the API
        // const data = await apiService.get(endpoints.maintenanceItems);
        
        // Using sample data for now
        setEquipment(sampleMaintenanceItems);
      } catch (err) {
        console.error('Error fetching equipment:', err);
        setError('Failed to load equipment data');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, []);

  const handleOpenModal = (type: ModalType, item?: MaintenanceItem) => {
    setModalType(type);
    
    if (item) {
      setCurrentItem(item);
      
      if (type === ModalType.EDIT) {
        setFormData({
          equipment_name: item.equipment_name,
          equipment_type: item.equipment_type,
          model_number: item.model_number || '',
          serial_number: item.serial_number || '',
          location: item.location,
          installation_date: item.installation_date || '',
          maintenance_frequency: item.maintenance_frequency,
          frequency_unit: item.frequency_unit,
          notes: item.notes || '',
        });
      }
    } else {
      // Reset form for add new
      setCurrentItem(null);
      setFormData({
        equipment_name: '',
        equipment_type: equipmentTypes[0],
        model_number: '',
        serial_number: '',
        location: locations[0],
        installation_date: new Date().toISOString().split('T')[0],
        maintenance_frequency: 3,
        frequency_unit: 'months',
        notes: '',
      });
    }
    
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
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
      // In real implementation, we would post to the API
      // const response = await apiService.post(endpoints.maintenanceItems, formData);
      
      // Mock add for demo
      const newItem: MaintenanceItem = {
        id: Math.max(...equipment.map(e => e.id)) + 1,
        equipment_name: formData.equipment_name,
        equipment_type: formData.equipment_type,
        model_number: formData.model_number,
        serial_number: formData.serial_number,
        location: formData.location,
        installation_date: formData.installation_date,
        maintenance_frequency: formData.maintenance_frequency,
        frequency_unit: formData.frequency_unit as 'days' | 'weeks' | 'months' | 'hours',
        next_maintenance_date: new Date(
          new Date().setMonth(
            new Date().getMonth() + formData.maintenance_frequency
          )
        ).toISOString().split('T')[0],
        status: 'operational',
        notes: formData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setEquipment([...equipment, newItem]);
      handleCloseModal();
    } catch (err) {
      console.error('Error adding equipment:', err);
      setError('Failed to add equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEquipment = async () => {
    if (!currentItem) return;
    
    try {
      setLoading(true);
      // In real implementation, we would put to the API
      // const response = await apiService.put(`${endpoints.maintenanceItems}${currentItem.id}/`, formData);
      
      // Mock edit for demo
      const updatedItem: MaintenanceItem = {
        ...currentItem,
        equipment_name: formData.equipment_name,
        equipment_type: formData.equipment_type,
        model_number: formData.model_number,
        serial_number: formData.serial_number,
        location: formData.location,
        installation_date: formData.installation_date,
        maintenance_frequency: formData.maintenance_frequency,
        frequency_unit: formData.frequency_unit as 'days' | 'weeks' | 'months' | 'hours',
        notes: formData.notes,
        updated_at: new Date().toISOString(),
      };
      
      setEquipment(equipment.map(item => 
        item.id === currentItem.id ? updatedItem : item
      ));
      handleCloseModal();
    } catch (err) {
      console.error('Error updating equipment:', err);
      setError('Failed to update equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEquipment = async () => {
    if (!currentItem) return;
    
    try {
      setLoading(true);
      // In real implementation, we would delete from the API
      // await apiService.delete(`${endpoints.maintenanceItems}${currentItem.id}/`);
      
      // Mock delete for demo
      setEquipment(equipment.filter(item => item.id !== currentItem.id));
      handleCloseModal();
    } catch (err) {
      console.error('Error deleting equipment:', err);
      setError('Failed to delete equipment');
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
                {/* Same form fields as ADD */}
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
      
      {/* Modal */}
      <Dialog 
        open={modalOpen} 
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        aria-labelledby="equipment-dialog-title"
        disablePortal={false}
        keepMounted={false}
      >
        {renderModalContent()}
      </Dialog>
    </Box>
  );
};

export default EquipmentList; 