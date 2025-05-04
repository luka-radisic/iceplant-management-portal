import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Chip,
  CircularProgress,
  Alert,
  FormGroup,
  Container,
  Tooltip,
  TablePagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import apiService from '../../services/api';
import { endpoints } from '../../services/endpoints';

interface Group {
  id: number;
  name: string;
  user_count: number;
}

interface Module {
  key: string;
  name: string;
  allowed: boolean;
}

interface ModuleGroupMapping {
  [key: string]: string[];
}

const GroupManagementPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  
  // State for groups data
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for module mapping
  const [moduleMapping, setModuleMapping] = useState<ModuleGroupMapping>({});

  // State for dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);

  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load groups data
  useEffect(() => {
    fetchGroups();
    fetchModuleMapping();
  }, []);
  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.get(endpoints.groups);
      setGroups(response.data);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const fetchModuleMapping = async () => {
    try {
      const response = await apiService.get(endpoints.modulePermissions);
      setModuleMapping(response.data);
      
      // Prepare available modules
      if (response.data) {
        const modules: Module[] = Object.keys(response.data).map(key => ({
          key,
          name: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize module name
          allowed: false
        }));
        setAvailableModules(modules);
      }
    } catch (err) {
      console.error('Error fetching module mapping:', err);
      enqueueSnackbar('Failed to load module permissions', { variant: 'error' });
    }
  };

  const openCreateDialog = () => {
    setGroupName('');
    setAvailableModules(prev => prev.map(module => ({ ...module, allowed: false })));
    setDialogMode('create');
    setDialogOpen(true);
  };

  const openEditDialog = (group: Group) => {
    setSelectedGroup(group);
    setGroupName(group.name);

    // Reset module permissions first
    setAvailableModules(prev => prev.map(module => ({ ...module, allowed: false })));

    // Mark modules that this group has access to
    setAvailableModules(prev => prev.map(module => {
      const groupsWithAccess = moduleMapping[module.key] || [];
      return {
        ...module,
        allowed: groupsWithAccess.includes(group.name)
      };
    }));

    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      enqueueSnackbar('Group name is required', { variant: 'error' });
      return;
    }    try {
      setDialogLoading(true);
      if (dialogMode === 'create') {
        // Create new group
        await apiService.post(endpoints.groups, { name: groupName });
        enqueueSnackbar('Group created successfully', { variant: 'success' });
      } else if (dialogMode === 'edit' && selectedGroup) {
        // Update existing group
        await apiService.put(`${endpoints.groups}${selectedGroup.id}/`, { name: groupName });
        enqueueSnackbar('Group updated successfully', { variant: 'success' });
      }
      
      // Refresh groups list
      await fetchGroups();
      setDialogOpen(false);
    } catch (err: any) {
      console.error('Error saving group:', err);
      const errorMessage = err.response?.data?.error || 'Failed to save group';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    // Ask for confirmation
    if (!window.confirm(`Are you sure you want to delete the group "${group.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.delete(`/api/groups/${group.id}/`);
      enqueueSnackbar('Group deleted successfully', { variant: 'success' });
      await fetchGroups();
    } catch (err: any) {
      console.error('Error deleting group:', err);
      const errorMessage = err.response?.data?.error || 'Failed to delete group';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleModuleToggle = (moduleKey: string) => {
    setAvailableModules(prev => prev.map(module => 
      module.key === moduleKey ? { ...module, allowed: !module.allowed } : module
    ));
  };

  // Function to check if a group has access to a specific module
  const hasModuleAccess = (groupName: string, moduleKey: string) => {
    const groupsWithAccess = moduleMapping[moduleKey] || [];
    return groupsWithAccess.includes(groupName);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Group Management
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
          >
            Create Group
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Group Name</TableCell>
                    <TableCell>Users</TableCell>
                    <TableCell>Module Access</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groups.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {group.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${group.user_count} users`} 
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {Object.keys(moduleMapping).map(moduleKey => (
                            hasModuleAccess(group.name, moduleKey) && (
                              <Chip
                                key={moduleKey}
                                label={moduleKey}
                                size="small"
                                variant="outlined"
                                color="success"
                              />
                            )
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit Group">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => openEditDialog(group)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        {/* Don't show delete button for protected groups */}
                        {!['Admins', 'Managers'].includes(group.name) && (
                          <Tooltip title="Delete Group">
                            <IconButton 
                              size="small" 
                              color="error" 
                              onClick={() => handleDeleteGroup(group)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={groups.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </>
        )}
      </Paper>

      {/* Create/Edit Group Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => !dialogLoading && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Create Group' : 'Edit Group'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            variant="outlined"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={dialogLoading || (dialogMode === 'edit' && ['Admins', 'Managers'].includes(groupName))}
            helperText={
              dialogMode === 'edit' && ['Admins', 'Managers'].includes(groupName) 
                ? "Protected groups can't be renamed" 
                : ""
            }
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle1" gutterBottom>
            Module Permissions
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            These permissions determine which modules users in this group can access.
          </Typography>

          <FormGroup>
            {availableModules.map(module => (
              <FormControlLabel
                key={module.key}
                control={
                  <Checkbox 
                    checked={module.allowed}
                    onChange={() => handleModuleToggle(module.key)}
                    color="primary"
                  />
                }
                label={module.name}
              />
            ))}
          </FormGroup>

          {dialogMode === 'edit' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Note: Changes to module permissions require backend configuration. 
              Please contact an administrator to update permissions.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogOpen(false)} 
            disabled={dialogLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveGroup} 
            variant="contained" 
            color="primary" 
            disabled={dialogLoading || !groupName.trim()}
          >
            {dialogLoading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GroupManagementPage;
