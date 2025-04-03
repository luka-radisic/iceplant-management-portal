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
  Autocomplete,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth as ScheduledIcon,
  ErrorOutline as EmergencyIcon,
  ConstructionOutlined as PreventiveIcon,
  BuildCircle as CorrectiveIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import {
  MaintenanceRecord, 
  MaintenanceItem 
} from '../../types/api';
import { formatDate, formatCurrency, formatDuration } from '../../utils/formatters';
import { useSnackbar } from 'notistack';
import apiService from '../../services/api';
import { endpoints } from '../../services/endpoints';

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
  const { enqueueSnackbar } = useSnackbar();
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(10);

  // Filtering state
  const [filterMonth, setFilterMonth] = useState<string>(''); // '' for All, '1'-'12' for months
  const [filterYear, setFilterYear] = useState<string>(''); // '' for All, e.g., '2024'
  const [filterEquipmentId, setFilterEquipmentId] = useState<string>(''); // '' for All, ID for specific item

  // Selection state
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);

  useEffect(() => {
    fetchData(page);
  }, [page]);

  const fetchData = async (pageNumber = 1) => {
    try {
      setLoading(true);
      // Build query parameters
      const params = new URLSearchParams({
        page: pageNumber.toString(),
        page_size: pageSize.toString(),
      });
      if (filterMonth) params.append('month', filterMonth);
      if (filterYear) params.append('year', filterYear);
      if (filterEquipmentId) params.append('item_id', filterEquipmentId); // Add equipment filter param

      const url = `${endpoints.maintenanceRecords}?${params.toString()}`;
      console.log(`[MaintenanceRecords] Fetching: ${url}`); // Log the URL
      const recordsResponse = await apiService.get(url);
      
      if (recordsResponse && typeof recordsResponse === 'object') {
        // Handle paginated response format
        if (recordsResponse.results) {
          setRecords(recordsResponse.results);
          setTotalItems(recordsResponse.count || 0);
        } else {
          setRecords(Array.isArray(recordsResponse) ? recordsResponse : []);
          setTotalItems(Array.isArray(recordsResponse) ? recordsResponse.length : 0);
        }
      } else {
        setRecords([]);
        setTotalItems(0);
      }
      
      // Fetch equipment items for the dropdown (no need for pagination here)
      const equipmentData = await apiService.get(endpoints.maintenanceItems);
      setEquipment(Array.isArray(equipmentData) ? equipmentData : equipmentData.results || []);
    } catch (err) {
      console.error('Error fetching maintenance data:', err);
      setError('Failed to load maintenance records');
      enqueueSnackbar('Failed to load maintenance data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // useEffect to refetch data when filters change (and reset page)
  useEffect(() => {
      console.log(`[MaintenanceRecords] Filters changed: Month=${filterMonth}, Year=${filterYear}, Equip=${filterEquipmentId}. Fetching page 1.`);
      if (page !== 1) {
          setPage(1); // Reset page, which triggers the other useEffect
      } else {
          fetchData(1); // Fetch directly if already on page 1
      }
  }, [filterMonth, filterYear, filterEquipmentId]);
  
  // useEffect to fetch data when page changes
  useEffect(() => {
    fetchData(page);
  }, [page]); // Keep original page change fetch

  // Clear selection when data reloads (filters, page change)
  useEffect(() => {
    setSelectedRecordIds([]);
  }, [records]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value,
    });
  };

  const handleAddRecord = async () => {
    try {
      setLoading(true);
      await apiService.post(endpoints.maintenanceRecords, formData);
      
      // Refresh records after adding
      fetchData(page);
      enqueueSnackbar('Maintenance record added successfully', { variant: 'success' });
      handleCloseModal();
    } catch (err) {
      console.error('Error adding maintenance record:', err);
      enqueueSnackbar('Failed to add maintenance record', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditRecord = async () => {
    if (!currentRecord) return;
    
    try {
      setLoading(true);
      await apiService.put(`${endpoints.maintenanceRecords}${currentRecord.id}/`, formData);
      
      // Refresh records after editing
      fetchData(page);
      enqueueSnackbar('Maintenance record updated successfully', { variant: 'success' });
      handleCloseModal();
    } catch (err) {
      console.error('Error updating maintenance record:', err);
      enqueueSnackbar('Failed to update maintenance record', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!currentRecord) return;
    
    try {
      setLoading(true);
      await apiService.delete(`${endpoints.maintenanceRecords}${currentRecord.id}/`);
      
      // Refresh records after deleting
      fetchData(page);
      enqueueSnackbar('Maintenance record deleted successfully', { variant: 'success' });
      handleCloseModal();
    } catch (err) {
      console.error('Error deleting maintenance record:', err);
      enqueueSnackbar('Failed to delete maintenance record', { variant: 'error' });
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
        
        // Function to handle printing
        const handlePrintPreview = () => {
          // Clear the other key first
          localStorage.removeItem('printSelectedMaintenanceRecords');
          // Set the key for the single record
          localStorage.setItem('printMaintenanceRecord', JSON.stringify(currentRecord));
          window.open(`/maintenance/print/${currentRecord.id}`, '_blank');
          handleCloseModal(); // Optionally close modal after opening print view
        };
        
        return (
          <>
            <DialogTitle id="maintenance-dialog-title">
              Maintenance Record Details
              <IconButton 
                aria-label="print"
                onClick={handlePrintPreview}
                sx={{ position: 'absolute', right: 8, top: 8 }}
                title="Print Preview"
              >
                <PrintIcon />
              </IconButton>
            </DialogTitle>
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
                  <Typography variant="body1" component="div" gutterBottom>
                    {getMaintenanceTypeChip(currentRecord.maintenance_type)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Typography variant="body1" component="div" gutterBottom>
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
                onClick={handlePrintPreview}
                color="secondary"
                startIcon={<PrintIcon />}
              >
                Print Preview
              </Button>
              <Button 
                onClick={() => {
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

  // Add this function to render pagination
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

  // Handlers for filter changes
  const handleMonthChange = (event: SelectChangeEvent) => {
    setFilterMonth(event.target.value as string);
  };

  const handleYearChange = (event: SelectChangeEvent) => {
    setFilterYear(event.target.value as string);
  };

  const handleEquipmentFilterChange = (event: React.SyntheticEvent, newValue: MaintenanceItem | null) => {
    setFilterEquipmentId(newValue ? newValue.id.toString() : '');
  };

  const resetFilters = () => {
    setFilterMonth('');
    setFilterYear('');
    setFilterEquipmentId(''); // Reset equipment filter
  };

  // Generate year options (e.g., last 5 years + current year)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString());

  // Handlers for selection
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelectedIds = records.map((record) => record.id);
      setSelectedRecordIds(newSelectedIds);
      return;
    }
    setSelectedRecordIds([]);
  };

  const handleCheckboxClick = (event: React.MouseEvent<unknown>, id: number) => {
    const selectedIndex = selectedRecordIds.indexOf(id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedRecordIds, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedRecordIds.slice(1));
    } else if (selectedIndex === selectedRecordIds.length - 1) {
      newSelected = newSelected.concat(selectedRecordIds.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedRecordIds.slice(0, selectedIndex),
        selectedRecordIds.slice(selectedIndex + 1),
      );
    }
    setSelectedRecordIds(newSelected);
  };

  const isSelected = (id: number) => selectedRecordIds.indexOf(id) !== -1;

  // Handler for Export to CSV
  const handleExportCsv = () => {
    if (selectedRecordIds.length === 0) {
      enqueueSnackbar('Please select records to export.', { variant: 'warning' });
      return;
    }

    const selectedRecords = records.filter(record => selectedRecordIds.includes(record.id));
    
    if (selectedRecords.length === 0) {
        enqueueSnackbar('No matching selected records found in current view.', { variant: 'warning' });
        return;
    }

    // Define CSV headers
    const headers = [
      'Record ID', 'Equipment Name', 'Maintenance Date', 'Type', 'Performed By',
      'Cost', 'Duration (Hrs)', 'Status', 'Parts Replaced', 'Issues Found', 
      'Actions Taken', 'Recommendations'
    ];
    
    // Function to escape CSV data
    const escapeCsv = (value: any): string => {
        const stringValue = String(value === null || value === undefined ? '' : value);
        // Correctly check for comma, double quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            // Correctly escape double quotes by doubling them and wrap in quotes
            return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue;
    };

    // Convert selected data to CSV rows
    const csvRows = selectedRecords.map(record => [
        escapeCsv(record.id),
        escapeCsv(record.maintenance_item?.equipment_name || 'N/A'),
        escapeCsv(formatDate(record.maintenance_date)),
        escapeCsv(record.maintenance_type),
        escapeCsv(record.performed_by),
        escapeCsv(record.cost),
        escapeCsv(record.duration),
        escapeCsv(record.status),
        escapeCsv(record.parts_replaced),
        escapeCsv(record.issues_found),
        escapeCsv(record.actions_taken),
        escapeCsv(record.recommendations),
    ].join(','));

    // Combine headers and rows
    const csvString = [headers.join(','), ...csvRows].join('\n');

    // Create blob and trigger download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    // Generate filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `maintenance_records_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    enqueueSnackbar(`Exported ${selectedRecords.length} records to CSV.`, { variant: 'success' });
  };

  // Placeholder for Print Selected (implement next)
  const handlePrintSelected = () => {
    if (selectedRecordIds.length === 0) {
      enqueueSnackbar('Please select records to print.', { variant: 'warning' });
      return;
    }

    const selectedRecordsData = records.filter(record => selectedRecordIds.includes(record.id));
    
    if (selectedRecordsData.length === 0) {
        enqueueSnackbar('No matching selected records found in current view.', { variant: 'warning' });
        return;
    }

    // Clear the other key first
    localStorage.removeItem('printMaintenanceRecord');
    // Store the array of selected records
    localStorage.setItem('printSelectedMaintenanceRecords', JSON.stringify(selectedRecordsData));
    
    // Open a generic print route for selected items
    window.open(`/maintenance/print/selected`, '_blank');
    
    enqueueSnackbar(`Preparing print view for ${selectedRecordsData.length} records...`, { variant: 'info' });
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Maintenance Records</Typography>
        <Box>
          {/* Export Button */}
          <Tooltip title="Export Selected Records to CSV">
            <span> {/* Span needed for Tooltip when Button is disabled */}
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<DownloadIcon />}
                onClick={handleExportCsv}
                disabled={selectedRecordIds.length === 0}
                sx={{ mr: 1 }}
              >
                Export Selected
              </Button>
            </span>
          </Tooltip>
          
          {/* Print Button */}
          <Tooltip title="Print Selected Records">
             <span> {/* Span needed for Tooltip when Button is disabled */}
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<PrintIcon />}
                onClick={handlePrintSelected}
                disabled={selectedRecordIds.length === 0}
                sx={{ mr: 1 }}
              >
                Print Selected
              </Button>
            </span>
          </Tooltip>
          
          {/* Add Record Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenModal(ModalType.ADD)}
          >
            Add Record
          </Button>
        </Box>
      </Box>
      
      {/* Filter Section */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Typography variant="subtitle2">Filter by Date:</Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="month-filter-label">Month</InputLabel>
              <Select
                labelId="month-filter-label"
                value={filterMonth}
                label="Month"
                onChange={handleMonthChange}
              >
                <MenuItem value="">All Months</MenuItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={(i + 1).toString()}>
                    {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="year-filter-label">Year</InputLabel>
              <Select
                labelId="year-filter-label"
                value={filterYear}
                label="Year"
                onChange={handleYearChange}
              >
                <MenuItem value="">All Years</MenuItem>
                {yearOptions.map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Autocomplete
              options={equipment} // Use the fetched equipment list
              getOptionLabel={(option) => option.equipment_name}
              value={equipment.find(eq => eq.id.toString() === filterEquipmentId) || null}
              onChange={handleEquipmentFilterChange}
              size="small"
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Filter by Equipment" 
                  placeholder="All Equipment" 
                />
              )}
            />
          </Grid>
          <Grid item>
            <Button variant="outlined" size="small" onClick={resetFilters}>
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {/* Select All Checkbox */}
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={
                    selectedRecordIds.length > 0 && selectedRecordIds.length < records.length
                  }
                  checked={records.length > 0 && selectedRecordIds.length === records.length}
                  onChange={handleSelectAllClick}
                  inputProps={{
                    'aria-label': 'select all maintenance records',
                  }}
                />
              </TableCell>
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
            {records.map((record) => {
              const isItemSelected = isSelected(record.id);
              const labelId = `maintenance-record-checkbox-${record.id}`;
              return (
                <TableRow 
                  key={record.id}
                  hover
                  onClick={(event) => handleCheckboxClick(event, record.id)} // Allow row click for selection
                  role="checkbox"
                  aria-checked={isItemSelected}
                  tabIndex={-1}
                  selected={isItemSelected}
                  sx={{ cursor: 'pointer' }} // Indicate row is clickable
                >
                  {/* Row Checkbox */}
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={isItemSelected}
                      inputProps={{
                        'aria-labelledby': labelId,
                      }}
                    />
                  </TableCell>
                  <TableCell 
                    // Keep existing onClick for VIEW modal, but prevent event propagation
                    onClick={(e) => { e.stopPropagation(); handleOpenModal(ModalType.VIEW, record); }} 
                    sx={{
                      cursor: 'pointer', 
                      '&:hover': { 
                        textDecoration: 'underline', 
                        color: 'primary.main' 
                      }
                    }}
                    title="View Record Details"
                    id={labelId} // Add id for aria-labelledby
                  >
                    {record.maintenance_item?.equipment_name || 'N/A'}
                  </TableCell>
                  <TableCell>{record.maintenance_item?.equipment_name || 'N/A'}</TableCell>
                  <TableCell>{formatDate(record.maintenance_date)}</TableCell>
                  <TableCell>{getMaintenanceTypeChip(record.maintenance_type)}</TableCell>
                  <TableCell>{record.performed_by}</TableCell>
                  <TableCell>{formatCurrency(record.cost)}</TableCell>
                  <TableCell>{formatDuration(record.duration)}</TableCell>
                  <TableCell>{getStatusChip(record.status)}</TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={(e) => { e.stopPropagation(); handleOpenModal(ModalType.EDIT, record); }}
                      title="Edit"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={(e) => { e.stopPropagation(); handleOpenModal(ModalType.DELETE, record); }}
                      title="Delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
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
        container={() => document.getElementById('root') || document.body}
        keepMounted={false}
        disableEnforceFocus
        disableRestoreFocus
        disableAutoFocus
        BackdropProps={{
          onClick: handleCloseModal
        }}
      >
        {renderModalContent()}
      </Dialog>
      
      {/* Pagination */}
      {renderPagination()}
    </Box>
  );
};

export default MaintenanceRecords; 