import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
  CalendarMonth as ScheduledIcon,
  ErrorOutline as EmergencyIcon,
  ConstructionOutlined as PreventiveIcon,
  BuildCircle as CorrectiveIcon,
} from '@mui/icons-material';
import { apiService, endpoints } from '../../services/api';
import { MaintenanceRecord, MaintenanceItem } from '../../types/api';
import { formatDate, formatCurrency, formatDuration } from '../../utils/formatters';
import { 
  sampleMaintenanceRecords,
  sampleMaintenanceItems 
} from '../../data/sampleMaintenanceData';

enum ModalType {
  ADD,
  EDIT,
  DELETE,
  VIEW
}

interface MaintenanceRecordsProps {
  // Props can be added as needed
}

const MaintenanceRecords: React.FC<MaintenanceRecordsProps> = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [equipment, setEquipment] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(ModalType.ADD);
  const [currentRecord, setCurrentRecord] = useState<MaintenanceRecord | null>(null);
  const [formData, setFormData] = useState({
    maintenance_item: 0,
    maintenance_date: '',
    maintenance_type: 'scheduled',
    performed_by: '',
    cost: 0,
    parts_replaced: '',
    duration: 1,
    issues_found: '',
    actions_taken: '',
    recommendations: '',
    status: 'scheduled',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // In real implementation, we would fetch from the API
        // const recordsData = await apiService.get(endpoints.maintenanceRecords);
        // const equipmentData = await apiService.get(endpoints.maintenanceItems);
        
        // Using sample data for now
        setRecords(sampleMaintenanceRecords);
        setEquipment(sampleMaintenanceItems);
      } catch (err) {
        console.error('Error fetching maintenance data:', err);
        setError('Failed to load maintenance records');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleOpenModal = (type: ModalType, record?: MaintenanceRecord) => {
    setModalType(type);
    
    if (record) {
      setCurrentRecord(record);
      
      if (type === ModalType.EDIT) {
        setFormData({
          maintenance_item: record.maintenance_item,
          maintenance_date: record.maintenance_date,
          maintenance_type: record.maintenance_type,
          performed_by: record.performed_by,
          cost: record.cost,
          parts_replaced: record.parts_replaced || '',
          duration: record.duration,
          issues_found: record.issues_found || '',
          actions_taken: record.actions_taken,
          recommendations: record.recommendations || '',
          status: record.status,
        });
      }
    } else {
      // Reset form for add new
      setCurrentRecord(null);
      setFormData({
        maintenance_item: equipment.length > 0 ? equipment[0].id : 0,
        maintenance_date: new Date().toISOString().split('T')[0],
        maintenance_type: 'scheduled',
        performed_by: '',
        cost: 0,
        parts_replaced: '',
        duration: 1,
        issues_found: '',
        actions_taken: '',
        recommendations: '',
        status: 'scheduled',
      });
    }
    
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value,
    });
  };

  const handleAddRecord = async () => {
    try {
      setLoading(true);
      // In real implementation, we would post to the API
      // const response = await apiService.post(endpoints.maintenanceRecords, formData);
      
      // Find the selected equipment name
      const selectedEquipment = equipment.find(eq => eq.id === formData.maintenance_item);
      
      // Mock add for demo
      const newRecord: MaintenanceRecord = {
        id: Math.max(...records.map(r => r.id)) + 1,
        maintenance_item: formData.maintenance_item,
        equipment_name: selectedEquipment?.equipment_name || 'Unknown Equipment',
        maintenance_date: formData.maintenance_date,
        maintenance_type: formData.maintenance_type as 'scheduled' | 'emergency' | 'preventive' | 'corrective',
        performed_by: formData.performed_by,
        cost: formData.cost,
        parts_replaced: formData.parts_replaced,
        duration: formData.duration,
        issues_found: formData.issues_found,
        actions_taken: formData.actions_taken,
        recommendations: formData.recommendations,
        status: formData.status as 'completed' | 'in_progress' | 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setRecords([...records, newRecord]);
      handleCloseModal();
    } catch (err) {
      console.error('Error adding maintenance record:', err);
      setError('Failed to add maintenance record');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRecord = async () => {
    if (!currentRecord) return;
    
    try {
      setLoading(true);
      // In real implementation, we would put to the API
      // const response = await apiService.put(`${endpoints.maintenanceRecords}${currentRecord.id}/`, formData);
      
      // Find the selected equipment name
      const selectedEquipment = equipment.find(eq => eq.id === formData.maintenance_item);
      
      // Mock edit for demo
      const updatedRecord: MaintenanceRecord = {
        ...currentRecord,
        maintenance_item: formData.maintenance_item,
        equipment_name: selectedEquipment?.equipment_name || currentRecord.equipment_name,
        maintenance_date: formData.maintenance_date,
        maintenance_type: formData.maintenance_type as 'scheduled' | 'emergency' | 'preventive' | 'corrective',
        performed_by: formData.performed_by,
        cost: formData.cost,
        parts_replaced: formData.parts_replaced,
        duration: formData.duration,
        issues_found: formData.issues_found,
        actions_taken: formData.actions_taken,
        recommendations: formData.recommendations,
        status: formData.status as 'completed' | 'in_progress' | 'scheduled',
        updated_at: new Date().toISOString(),
      };
      
      setRecords(records.map(record => 
        record.id === currentRecord.id ? updatedRecord : record
      ));
      handleCloseModal();
    } catch (err) {
      console.error('Error updating maintenance record:', err);
      setError('Failed to update maintenance record');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!currentRecord) return;
    
    try {
      setLoading(true);
      // In real implementation, we would delete from the API
      // await apiService.delete(`${endpoints.maintenanceRecords}${currentRecord.id}/`);
      
      // Mock delete for demo
      setRecords(records.filter(record => record.id !== currentRecord.id));
      handleCloseModal();
    } catch (err) {
      console.error('Error deleting maintenance record:', err);
      setError('Failed to delete maintenance record');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    let color: 'success' | 'warning' | 'info' | 'default' = 'default';
    let label = 'Unknown';
    
    switch (status) {
      case 'completed':
        color = 'success';
        label = 'Completed';
        break;
      case 'in_progress':
        color = 'info';
        label = 'In Progress';
        break;
      case 'scheduled':
        color = 'warning';
        label = 'Scheduled';
        break;
    }
    
    return <Chip label={label} color={color} size="small" />;
  };

  const getMaintenanceTypeChip = (type: string) => {
    let color: 'primary' | 'secondary' | 'success' | 'error' = 'primary';
    let icon = <ScheduledIcon fontSize="small" />;
    let label = 'Scheduled';
    
    switch (type) {
      case 'scheduled':
        color = 'primary';
        icon = <ScheduledIcon fontSize="small" />;
        label = 'Scheduled';
        break;
      case 'emergency':
        color = 'error';
        icon = <EmergencyIcon fontSize="small" />;
        label = 'Emergency';
        break;
      case 'preventive':
        color = 'success';
        icon = <PreventiveIcon fontSize="small" />;
        label = 'Preventive';
        break;
      case 'corrective':
        color = 'secondary';
        icon = <CorrectiveIcon fontSize="small" />;
        label = 'Corrective';
        break;
    }
    
    return (
      <Chip 
        label={label} 
        color={color} 
        size="small" 
        icon={icon}
      />
    );
  };

  const renderModalContent = () => {
    switch (modalType) {
      case ModalType.ADD:
      case ModalType.EDIT:
        return (
          <>
            <DialogTitle id="maintenance-dialog-title">
              {modalType === ModalType.ADD ? 'Add New Maintenance Record' : 'Edit Maintenance Record'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="equipment-label">Equipment</InputLabel>
                    <Select
                      labelId="equipment-label"
                      name="maintenance_item"
                      value={formData.maintenance_item}
                      onChange={handleInputChange}
                      label="Equipment"
                    >
                      {equipment.map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.equipment_name} ({item.equipment_type})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Maintenance Date"
                    name="maintenance_date"
                    value={formData.maintenance_date}
                    onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="type-label">Maintenance Type</InputLabel>
                    <Select
                      labelId="type-label"
                      name="maintenance_type"
                      value={formData.maintenance_type}
                      onChange={handleInputChange}
                      label="Maintenance Type"
                    >
                      <MenuItem value="scheduled">Scheduled</MenuItem>
                      <MenuItem value="emergency">Emergency</MenuItem>
                      <MenuItem value="preventive">Preventive</MenuItem>
                      <MenuItem value="corrective">Corrective</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="status-label">Status</InputLabel>
                    <Select
                      labelId="status-label"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      label="Status"
                    >
                      <MenuItem value="scheduled">Scheduled</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Performed By"
                    name="performed_by"
                    value={formData.performed_by}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Cost"
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    InputProps={{ inputProps: { min: 0, step: 100 } }}
                    required
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Duration (hours)"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    InputProps={{ inputProps: { min: 0, step: 0.5 } }}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Parts Replaced"
                    name="parts_replaced"
                    value={formData.parts_replaced}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Issues Found"
                    name="issues_found"
                    value={formData.issues_found}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Actions Taken"
                    name="actions_taken"
                    value={formData.actions_taken}
                    onChange={handleInputChange}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Recommendations"
                    name="recommendations"
                    value={formData.recommendations}
                    onChange={handleInputChange}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button 
                onClick={modalType === ModalType.ADD ? handleAddRecord : handleEditRecord} 
                variant="contained" 
                color="primary"
              >
                {modalType === ModalType.ADD ? 'Add Record' : 'Update Record'}
              </Button>
            </DialogActions>
          </>
        );
      
      case ModalType.DELETE:
        return (
          <>
            <DialogTitle id="maintenance-dialog-title">Delete Maintenance Record</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete the maintenance record for
                <strong> {currentRecord?.equipment_name}</strong> from
                <strong> {currentRecord?.maintenance_date}</strong>?
                This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button 
                onClick={handleDeleteRecord} 
                variant="contained" 
                color="error"
              >
                Delete
              </Button>
            </DialogActions>
          </>
        );
      
      case ModalType.VIEW:
        if (!currentRecord) return null;
        return (
          <>
            <DialogTitle id="maintenance-dialog-title">Maintenance Record Details</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Equipment</Typography>
                  <Typography variant="body1" gutterBottom>{currentRecord.equipment_name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Date</Typography>
                  <Typography variant="body1" gutterBottom>{formatDate(currentRecord.maintenance_date)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Type</Typography>
                  <Typography variant="body1" gutterBottom>
                    {getMaintenanceTypeChip(currentRecord.maintenance_type)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Typography variant="body1" gutterBottom>
                    {getStatusChip(currentRecord.status)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Performed By</Typography>
                  <Typography variant="body1" gutterBottom>{currentRecord.performed_by}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="subtitle2">Cost</Typography>
                  <Typography variant="body1" gutterBottom>{formatCurrency(currentRecord.cost)}</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="subtitle2">Duration</Typography>
                  <Typography variant="body1" gutterBottom>{formatDuration(currentRecord.duration)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Parts Replaced</Typography>
                  <Typography variant="body1" gutterBottom>
                    {currentRecord.parts_replaced || 'None'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Issues Found</Typography>
                  <Typography variant="body1" gutterBottom>
                    {currentRecord.issues_found || 'None reported'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Actions Taken</Typography>
                  <Typography variant="body1" gutterBottom>{currentRecord.actions_taken}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Recommendations</Typography>
                  <Typography variant="body1" gutterBottom>
                    {currentRecord.recommendations || 'None provided'}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseModal}>Close</Button>
              <Button 
                onClick={() => {
                  handleCloseModal();
                  handleOpenModal(ModalType.EDIT, currentRecord);
                }} 
                color="primary"
              >
                Edit
              </Button>
            </DialogActions>
          </>
        );
      default:
        return null;
    }
  };

  if (loading && records.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', m: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && records.length === 0) {
    return (
      <Box sx={{ m: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Maintenance Records</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenModal(ModalType.ADD)}
        >
          Add Record
        </Button>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Equipment</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Performed By</TableCell>
              <TableCell>Cost</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.equipment_name}</TableCell>
                <TableCell>{formatDate(record.maintenance_date)}</TableCell>
                <TableCell>{getMaintenanceTypeChip(record.maintenance_type)}</TableCell>
                <TableCell>{record.performed_by}</TableCell>
                <TableCell>{formatCurrency(record.cost)}</TableCell>
                <TableCell>{formatDuration(record.duration)}</TableCell>
                <TableCell>{getStatusChip(record.status)}</TableCell>
                <TableCell align="center">
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleOpenModal(ModalType.EDIT, record)}
                    title="Edit"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleOpenModal(ModalType.DELETE, record)}
                    title="Delete"
                  >
                    <DeleteIcon fontSize="small" />
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
        aria-labelledby="maintenance-dialog-title"
        disablePortal={false}
        keepMounted={false}
      >
        {renderModalContent()}
      </Dialog>
    </Box>
  );
};

export default MaintenanceRecords; 