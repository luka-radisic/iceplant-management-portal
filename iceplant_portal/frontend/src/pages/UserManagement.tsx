import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Switch,
  FormControlLabel,
  Chip,
  TextField,
  Snackbar,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { apiService } from '../services/api';
import { useSnackbar } from 'notistack';

interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
}

interface EditUserData {
  username: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  password?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  // Dialog states
  const [openDelete, setOpenDelete] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editUserData, setEditUserData] = useState<EditUserData>({
    username: '',
    email: '',
    is_active: true,
    is_staff: false,
    is_superuser: false,
    password: '',
  });

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log('Fetching users...');
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setError('You must be logged in to view users. Please log in again.');
        setLoading(false);
        return;
      }
      
      // First request to the main users endpoint
      const response = await apiService.get('/api/users/');
      console.log('Raw API response:', response);
      
      // Check if the response is a URL pointer instead of actual user data
      if (response && typeof response === 'object' && response.users && typeof response.users === 'string' && response.users.includes('/api/users/users/')) {
        console.log('Following users URL:', response.users);
        
        // Make a second request to the actual users endpoint
        const usersResponse = await apiService.get('/api/users/users/');
        console.log('Users endpoint response:', usersResponse);
        
        // Process the users response
        if (Array.isArray(usersResponse)) {
          console.log('Users response is an array with length:', usersResponse.length);
          setUsers(usersResponse);
        } else if (usersResponse && typeof usersResponse === 'object') {
          if (Array.isArray(usersResponse.results)) {
            console.log('Found results array with length:', usersResponse.results.length);
            setUsers(usersResponse.results);
          } else {
            // Try to extract user objects
            const possibleUsers = Object.values(usersResponse).filter(
              (item) => item && typeof item === 'object' && 'username' in item
            );
            console.log('Extracted possible users from users response:', possibleUsers.length);
            setUsers(possibleUsers.length > 0 ? possibleUsers : []);
          }
        } else {
          console.error('Unexpected users response format:', usersResponse);
          setError('Unexpected API response format for users.');
        }
      } else {
        // Handle standard response structures as before
        let userArray = [];
        
        if (Array.isArray(response)) {
          console.log('Response is an array with length:', response.length);
          userArray = response;
        } else if (response && typeof response === 'object') {
          console.log('Response is an object with keys:', Object.keys(response));
          
          // Check for authentication error
          if (response.detail && (
              response.detail.includes('Authentication') || 
              response.detail.includes('credentials') ||
              response.detail.includes('permission')
          )) {
            throw new Error('Authentication error: ' + response.detail);
          }
          
          // If response is an object, look for common pagination patterns
          if (Array.isArray(response.results)) {
            console.log('Found results array with length:', response.results.length);
            userArray = response.results; // DRF pagination format
          } else if (response.users && Array.isArray(response.users)) {
            console.log('Found users array with length:', response.users.length);
            userArray = response.users; // Custom format
          } else {
            // If we have an object but no recognized array property,
            // try to convert the object values to an array if they look like user objects
            const possibleUsers = Object.values(response).filter(
              (item) => item && typeof item === 'object' && 'username' in item
            );
            console.log('Extracted possible users from object values:', possibleUsers.length);
            if (possibleUsers.length > 0) {
              userArray = possibleUsers;
            }
          }
        }
        
        console.log('Final processed user array:', userArray);
        setUsers(userArray);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      if (err.response?.status === 401 || err.response?.status === 403 || 
          (err.message && err.message.includes('Authentication'))) {
        setError('Authentication error: You do not have permission to view users or your session has expired. Please log in again.');
      } else {
        setError('Failed to load users. ' + (err.message || ''));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle dialog open/close
  const handleOpenDelete = (user: User) => {
    setSelectedUser(user);
    setOpenDelete(true);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
    setSelectedUser(null);
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setEditUserData({
      username: user.username,
      email: user.email,
      is_active: user.is_active,
      is_staff: user.is_staff,
      is_superuser: user.is_superuser,
    });
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setSelectedUser(null);
  };

  const handleOpenCreate = () => {
    setEditUserData({
      username: '',
      email: '',
      is_active: true,
      is_staff: false,
      is_superuser: false,
      password: '',
    });
    setOpenCreate(true);
  };

  const handleCloseCreate = () => {
    setOpenCreate(false);
  };

  // Handle form changes
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setEditUserData((prev) => ({
      ...prev,
      [name]: name === 'is_active' || name === 'is_staff' || name === 'is_superuser' ? checked : value,
    }));
  };

  // CRUD operations
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await apiService.delete(`/api/users/${selectedUser.id}/`);
      enqueueSnackbar(`User ${selectedUser.username} deleted successfully`, { variant: 'success' });
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      enqueueSnackbar('Failed to delete user', { variant: 'error' });
    } finally {
      handleCloseDelete();
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      await apiService.put(`/api/users/${selectedUser.id}/`, editUserData);
      enqueueSnackbar(`User ${selectedUser.username} updated successfully`, { variant: 'success' });
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      enqueueSnackbar('Failed to update user', { variant: 'error' });
    } finally {
      handleCloseEdit();
    }
  };

  const handleCreateUser = async () => {
    if (!editUserData.username || !editUserData.email || !editUserData.password) {
      enqueueSnackbar('Please fill all required fields', { variant: 'error' });
      return;
    }

    try {
      await apiService.post('/api/users/', editUserData);
      enqueueSnackbar(`User ${editUserData.username} created successfully`, { variant: 'success' });
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      enqueueSnackbar('Failed to create user', { variant: 'error' });
    } finally {
      handleCloseCreate();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button 
          variant="contained" 
          startIcon={<PersonAddIcon />}
          onClick={handleOpenCreate}
        >
          Add User
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.is_active ? 'Active' : 'Inactive'} 
                      color={user.is_active ? 'success' : 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    {user.is_superuser ? (
                      <Chip 
                        icon={<AdminPanelSettingsIcon />} 
                        label="Superuser" 
                        color="warning" 
                        size="small" 
                      />
                    ) : user.is_staff ? (
                      <Chip 
                        icon={<AdminPanelSettingsIcon />} 
                        label="Admin" 
                        color="primary" 
                        size="small" 
                      />
                    ) : (
                      <Chip label="User" size="small" />
                    )}
                  </TableCell>
                  <TableCell>{new Date(user.date_joined).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleOpenEdit(user)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleOpenDelete(user)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDelete}
        onClose={handleCloseDelete}
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the user "{selectedUser?.username}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>Cancel</Button>
          <Button onClick={handleDeleteUser} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={openEdit}
        onClose={handleCloseEdit}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={editUserData.username}
              onChange={handleEditChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={editUserData.email}
              onChange={handleEditChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="New Password (leave blank to keep current)"
              name="password"
              type="password"
              value={editUserData.password || ''}
              onChange={handleEditChange}
              margin="normal"
            />
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editUserData.is_active}
                    onChange={handleEditChange}
                    name="is_active"
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editUserData.is_staff}
                    onChange={handleEditChange}
                    name="is_staff"
                  />
                }
                label="Admin Access"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editUserData.is_superuser}
                    onChange={handleEditChange}
                    name="is_superuser"
                  />
                }
                label="Superuser"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancel</Button>
          <Button onClick={handleUpdateUser} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog
        open={openCreate}
        onClose={handleCloseCreate}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={editUserData.username}
              onChange={handleEditChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={editUserData.email}
              onChange={handleEditChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={editUserData.password || ''}
              onChange={handleEditChange}
              margin="normal"
              required
            />
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editUserData.is_active}
                    onChange={handleEditChange}
                    name="is_active"
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editUserData.is_staff}
                    onChange={handleEditChange}
                    name="is_staff"
                  />
                }
                label="Admin Access"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editUserData.is_superuser}
                    onChange={handleEditChange}
                    name="is_superuser"
                  />
                }
                label="Superuser"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreate}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">Create User</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 