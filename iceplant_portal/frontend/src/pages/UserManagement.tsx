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
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import InfoIcon from '@mui/icons-material/Info';
import { apiService } from '../services/api';
import { useSnackbar } from 'notistack';
import { Link, useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

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
      await apiService.delete(`/api/users/users/${selectedUser.id}/`);
      enqueueSnackbar(`User ${selectedUser.username} deleted successfully`, { variant: 'success' });
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      // Display more detailed error message if available
      if (err.response?.data) {
        const errorMessage = typeof err.response.data === 'string' 
          ? err.response.data 
          : Object.entries(err.response.data)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ');
        enqueueSnackbar(`Failed to delete user: ${errorMessage}`, { variant: 'error' });
      } else {
        enqueueSnackbar('Failed to delete user', { variant: 'error' });
      }
    } finally {
      handleCloseDelete();
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      // Create a payload that only includes fields that changed
      const updateData: Record<string, any> = {};
      
      if (editUserData.username !== selectedUser.username) {
        updateData.username = editUserData.username;
      }
      
      if (editUserData.email !== selectedUser.email) {
        updateData.email = editUserData.email;
      }
      
      // Only include password if it was entered (not empty)
      if (editUserData.password) {
        updateData.password = editUserData.password;
      }
      
      updateData.is_active = editUserData.is_active;
      updateData.is_staff = editUserData.is_staff;
      updateData.is_superuser = editUserData.is_superuser;
      
      // Use PATCH instead of PUT to only update provided fields
      await apiService.patch(`/api/users/users/${selectedUser.id}/`, updateData);
      enqueueSnackbar(`User ${selectedUser.username} updated successfully`, { variant: 'success' });
      fetchUsers();
    } catch (err: any) {
      console.error('Error updating user:', err);
      // Display more detailed error message if available
      if (err.response?.data) {
        const errorMessage = typeof err.response.data === 'string' 
          ? err.response.data 
          : Object.entries(err.response.data)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ');
        enqueueSnackbar(`Failed to update user: ${errorMessage}`, { variant: 'error' });
      } else {
        enqueueSnackbar('Failed to update user', { variant: 'error' });
      }
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
      // Create a properly formatted payload for Django user creation
      const userData = {
        username: editUserData.username,
        email: editUserData.email,
        password: editUserData.password,
        is_active: editUserData.is_active,
        is_staff: editUserData.is_staff,
        is_superuser: editUserData.is_superuser
      };
      
      await apiService.post('/api/users/users/', userData);
      enqueueSnackbar(`User ${editUserData.username} created successfully`, { variant: 'success' });
      fetchUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      // Display more detailed error message if available
      if (err.response?.data) {
        const errorMessage = typeof err.response.data === 'string' 
          ? err.response.data 
          : Object.entries(err.response.data)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ');
        enqueueSnackbar(`Failed to create user: ${errorMessage}`, { variant: 'error' });
      } else {
        enqueueSnackbar('Failed to create user', { variant: 'error' });
      }
    } finally {
      handleCloseCreate();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            color="secondary"
            startIcon={<SecurityIcon />}
            onClick={() => navigate('/admin/permissions')}
          >
            Manage Roles & Permissions
          </Button>
          <Button 
            variant="contained" 
            startIcon={<PersonAddIcon />}
            onClick={handleOpenCreate}
          >
            Add User
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            User Roles & Permissions System
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Users can have system roles (Admin, Superuser) and/or custom roles with specific permissions.
            For detailed role management, permissions assignment, and role creation, use the 
            <Button 
              component={Link} 
              to="/admin/permissions"
              size="small"
              sx={{ mx: 1 }}
            >
              Permissions Management
            </Button> 
            page.
          </Typography>
        </CardContent>
      </Card>

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
                <TableCell>System Role</TableCell>
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
                      <Tooltip title="Full access to all system features">
                        <Chip 
                          icon={<AdminPanelSettingsIcon />} 
                          label="Superuser" 
                          color="warning" 
                          size="small" 
                        />
                      </Tooltip>
                    ) : user.is_staff ? (
                      <Tooltip title="Administrative access">
                        <Chip 
                          icon={<AdminPanelSettingsIcon />} 
                          label="Admin" 
                          color="primary" 
                          size="small" 
                        />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Standard user with custom permissions">
                        <Chip 
                          label="User" 
                          size="small"
                          onClick={() => navigate(`/admin/permissions?user=${user.id}`)}
                          clickable
                        />
                      </Tooltip>
                    )}
                    <Tooltip title="Manage detailed permissions">
                      <IconButton 
                        size="small"
                        onClick={() => navigate(`/admin/permissions?user=${user.id}`)}
                        sx={{ ml: 1 }}
                      >
                        <SecurityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{new Date(user.date_joined).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpenEdit(user)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleOpenDelete(user)}
                      disabled={user.is_superuser} // Prevent deleting superusers
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
          <DialogContentText sx={{ mb: 2 }}>
            Edit user details and system roles. For custom role assignment, use the
            <Button 
              component={Link} 
              to={`/admin/permissions?user=${selectedUser?.id}`}
              size="small"
              sx={{ mx: 1 }}
            >
              Permissions Page
            </Button>
          </DialogContentText>
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
              <Typography variant="subtitle2" gutterBottom>
                System Roles
              </Typography>
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
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <span>Admin Access</span>
                    <Tooltip title="Administrative access to manage system">
                      <InfoIcon fontSize="small" sx={{ ml: 1, color: 'action.active' }} />
                    </Tooltip>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editUserData.is_superuser}
                    onChange={handleEditChange}
                    name="is_superuser"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <span>Superuser</span>
                    <Tooltip title="Full unrestricted access to all system features">
                      <InfoIcon fontSize="small" sx={{ ml: 1, color: 'action.active' }} />
                    </Tooltip>
                  </Box>
                }
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancel</Button>
          <Button 
            component={Link}
            to={`/admin/permissions?user=${selectedUser?.id}`}
            color="secondary"
          >
            Manage Custom Roles
          </Button>
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