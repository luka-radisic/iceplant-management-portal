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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  CircularProgress,
  Alert,
  Container,
  Tooltip,
  TablePagination,
  SelectChangeEvent,
  InputAdornment,
} from '@mui/material';
import {
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import apiService from '../../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
  is_staff: boolean;
  groups: string[];
}

interface Group {
  id: number;
  name: string;
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const UserManagementPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  
  // State for users data
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // State for groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // State for dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);

  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load users and groups data
  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, []);

  // Filter users based on search term and group filter
  useEffect(() => {
    let result = [...users];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.username.toLowerCase().includes(term) || 
        user.email.toLowerCase().includes(term) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(term)
      );
    }
    
    // Filter by group
    if (selectedFilter !== 'all') {
      result = result.filter(user => user.groups.includes(selectedFilter));
    }
    
    setFilteredUsers(result);
    setPage(0); // Reset to first page when filtering
  }, [users, searchTerm, selectedFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.get('/api/user-management/');
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await apiService.get('/api/groups/');
      setGroups(response.data);
    } catch (err) {
      console.error('Error fetching groups:', err);
      enqueueSnackbar('Failed to load groups', { variant: 'error' });
    }
  };

  const openEditGroupsDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedGroups(user.groups || []);
    setDialogOpen(true);
  };

  const handleSaveUserGroups = async () => {
    if (!selectedUser) return;

    try {
      setDialogLoading(true);
      await apiService.post(`/api/user-management/${selectedUser.id}/assign_groups/`, {
        group_ids: groups
          .filter(group => selectedGroups.includes(group.name))
          .map(group => group.id)
      });
      
      enqueueSnackbar('User groups updated successfully', { variant: 'success' });
      await fetchUsers(); // Refresh users list
      setDialogOpen(false);
    } catch (err: any) {
      console.error('Error updating user groups:', err);
      const errorMessage = err.response?.data?.error || 'Failed to update user groups';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleGroupFilterChange = (event: SelectChangeEvent) => {
    setSelectedFilter(event.target.value);
  };

  const handleGroupSelectionChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedGroups(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            User Management
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            placeholder="Search users..."
            variant="outlined"
            size="small"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="group-filter-label">Filter by Group</InputLabel>
            <Select
              labelId="group-filter-label"
              value={selectedFilter}
              onChange={handleGroupFilterChange}
              label="Filter by Group"
            >
              <MenuItem value="all">All Users</MenuItem>
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.name}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
                    <TableCell>Username</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Groups</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {user.username}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {user.first_name || user.last_name ? (
                          `${user.first_name} ${user.last_name}`
                        ) : (
                          <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            Not set
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {user.groups.length > 0 ? (
                            user.groups.map((group) => (
                              <Chip
                                key={group}
                                label={group}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              No groups
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {user.is_superuser ? (
                          <Chip
                            icon={<VerifiedUserIcon />}
                            label="Superuser"
                            size="small"
                            color="error"
                          />
                        ) : user.is_staff ? (
                          <Chip
                            icon={<AdminIcon />}
                            label="Staff"
                            size="small"
                            color="warning"
                          />
                        ) : (
                          <Chip
                            icon={<PersonIcon />}
                            label="User"
                            size="small"
                            color="default"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit Groups">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openEditGroupsDialog(user)}
                            disabled={user.is_superuser && !user.is_superuser} // Only superusers can modify other superusers
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredUsers.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </>
        )}
      </Paper>

      {/* Edit User Groups Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => !dialogLoading && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Edit User Groups
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                User: {selectedUser.username}
              </Typography>
              
              {selectedUser.is_superuser && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This is a superuser. Only other superusers can modify their groups.
                </Alert>
              )}
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="group-select-label">Groups</InputLabel>
                <Select
                  labelId="group-select-label"
                  multiple
                  value={selectedGroups}
                  onChange={handleGroupSelectionChange}
                  input={<OutlinedInput label="Groups" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                  disabled={selectedUser.is_superuser && !selectedUser.is_superuser}
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.name}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                Group changes affect what modules and features the user can access.
              </Alert>
            </>
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
            onClick={handleSaveUserGroups}
            variant="contained"
            color="primary"
            disabled={dialogLoading || (selectedUser?.is_superuser && !selectedUser?.is_superuser)}
          >
            {dialogLoading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagementPage;
