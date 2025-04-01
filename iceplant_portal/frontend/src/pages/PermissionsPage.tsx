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
  DialogActions,
  FormControlLabel,
  Checkbox,
  Chip,
  TextField,
  Tabs,
  Tab,
  Divider,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  FormControl,
  InputLabel,
  Switch,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useSnackbar } from 'notistack';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

// Interface definitions
interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
}

interface Permission {
  id: number;
  user: number;
  permission_type: string;
  permission_display: string;
}

interface Role {
  id: number;
  name: string;
  role_type: string;
  description: string;
  is_active: boolean;
  permissions: string[];
}

interface UserRole {
  id: number;
  user: number;
  role: number;
  role_name: string;
  assigned_at: string;
  assigned_by: number | null;
}

// TabPanel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`permissions-tabpanel-${index}`}
      aria-labelledby={`permissions-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `permissions-tab-${index}`,
    'aria-controls': `permissions-tabpanel-${index}`,
  };
}

// Permission categories for UI organization
const permissionCategories = [
  {
    name: 'Inventory',
    permissions: ['inventory_view', 'inventory_add', 'inventory_edit', 'inventory_delete']
  },
  {
    name: 'Sales',
    permissions: ['sales_view', 'sales_add', 'sales_edit', 'sales_delete']
  },
  {
    name: 'Expenses',
    permissions: ['expenses_view', 'expenses_add', 'expenses_edit', 'expenses_delete', 'expenses_approve']
  },
  {
    name: 'Buyers',
    permissions: ['buyers_view', 'buyers_add', 'buyers_edit', 'buyers_delete']
  },
  {
    name: 'Attendance',
    permissions: ['attendance_view', 'attendance_add', 'attendance_edit']
  },
  {
    name: 'Reports',
    permissions: ['reports_view', 'reports_export']
  },
  {
    name: 'User Management',
    permissions: ['user_management', 'permissions_management']
  }
];

// Permission names for display
const permissionDisplayNames: Record<string, string> = {
  'inventory_view': 'View Inventory',
  'inventory_add': 'Add Inventory Items',
  'inventory_edit': 'Edit Inventory Items',
  'inventory_delete': 'Delete Inventory Items',
  'sales_view': 'View Sales',
  'sales_add': 'Add Sales',
  'sales_edit': 'Edit Sales',
  'sales_delete': 'Delete Sales',
  'expenses_view': 'View Expenses',
  'expenses_add': 'Add Expenses',
  'expenses_edit': 'Edit Expenses',
  'expenses_delete': 'Delete Expenses',
  'expenses_approve': 'Approve Expenses',
  'buyers_view': 'View Buyers',
  'buyers_add': 'Add Buyers',
  'buyers_edit': 'Edit Buyers',
  'buyers_delete': 'Delete Buyers',
  'attendance_view': 'View Attendance',
  'attendance_add': 'Add Attendance',
  'attendance_edit': 'Edit Attendance',
  'reports_view': 'View Reports',
  'reports_export': 'Export Reports',
  'user_management': 'Manage Users',
  'permissions_management': 'Manage Permissions'
};

// Helper function to parse query parameters
const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const PermissionsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const query = useQuery();
  const navigate = useNavigate();
  const userIdFromQuery = query.get('user');
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [selectedUserForMatrix, setSelectedUserForMatrix] = useState<number | null>(null);
  const [permissionFilter, setPermissionFilter] = useState('');
  
  // Dialog states
  const [openAssignRole, setOpenAssignRole] = useState(false);
  const [openEditRole, setOpenEditRole] = useState(false);
  const [openCreateRole, setOpenCreateRole] = useState(false);
  const [openDeleteRole, setOpenDeleteRole] = useState(false);
  const [openRemoveUserRole, setOpenRemoveUserRole] = useState(false);
  
  // Form state
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [selectedRoleData, setSelectedRoleData] = useState<Role | null>(null);
  const [userRoleToRemove, setUserRoleToRemove] = useState<{id: number, roleName: string, userName: string} | null>(null);
  const [newRoleData, setNewRoleData] = useState<{
    name: string;
    role_type: string;
    description: string;
    permissions: string[];
  }>({
    name: '',
    role_type: 'custom',
    description: '',
    permissions: []
  });

  // Initialize with user ID from URL if provided
  useEffect(() => {
    if (userIdFromQuery && users.length > 0) {
      const userId = parseInt(userIdFromQuery, 10);
      if (!isNaN(userId)) {
        // Only set the selected user if it exists in the users array
        if (users.some(user => user.id === userId)) {
          setSelectedUserForMatrix(userId);
          // Switch to permissions matrix tab
          setTabValue(2);
        } else {
          // If user doesn't exist, clear the URL param
          navigate('/admin/permissions');
        }
      }
    }
  }, [userIdFromQuery, users]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Clear the user parameter from URL when changing tabs
    if (newValue !== 2 && userIdFromQuery) {
      navigate('/admin/permissions');
    }
  };

  // Updated handler for selecting a user in the matrix
  const handleSelectUserForMatrix = (userId: number | string) => {
    if (!userId) {
      setSelectedUserForMatrix(null);
      navigate('/admin/permissions');
      return;
    }
    
    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    
    // Make sure the user exists
    if (users.some(user => user.id === id)) {
      setSelectedUserForMatrix(id);
      // Update URL with user parameter
      navigate(`/admin/permissions?user=${id}`);
    } else {
      enqueueSnackbar('Selected user not found', { variant: 'error' });
      setSelectedUserForMatrix(null);
      navigate('/admin/permissions');
    }
  };

  // Fetch all necessary data on component mount
  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchUserRoles();
    fetchPermissions();
  }, []);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/users/users/');
      
      // Handle different response formats
      let userData = [];
      if (Array.isArray(response)) {
        userData = response;
      } else if (response && typeof response === 'object') {
        if (Array.isArray(response.results)) {
          userData = response.results;
        } else {
          userData = Object.values(response).filter(
            (item) => item && typeof item === 'object' && 'username' in item
          );
        }
      }
      
      setUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch roles from API
  const fetchRoles = async () => {
    try {
      const response = await apiService.get('/api/users/roles/');
      
      if (Array.isArray(response)) {
        setRoles(response);
      } else if (response && typeof response === 'object' && response.results) {
        setRoles(response.results);
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      enqueueSnackbar('Failed to load roles', { variant: 'error' });
    }
  };

  // Fetch user-role assignments
  const fetchUserRoles = async () => {
    try {
      const response = await apiService.get('/api/users/user-roles/');
      
      if (Array.isArray(response)) {
        setUserRoles(response);
      } else if (response && typeof response === 'object' && response.results) {
        setUserRoles(response.results);
      } else {
        setUserRoles([]);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      enqueueSnackbar('Failed to load user role assignments', { variant: 'error' });
    }
  };

  // Fetch permissions
  const fetchPermissions = async () => {
    try {
      const response = await apiService.get('/api/users/permissions/');
      
      if (Array.isArray(response)) {
        setPermissions(response);
      } else if (response && typeof response === 'object' && response.results) {
        setPermissions(response.results);
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      enqueueSnackbar('Failed to load permissions', { variant: 'error' });
    }
  };

  // Assign role to user
  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      enqueueSnackbar('Please select both user and role', { variant: 'warning' });
      return;
    }

    // Check if the role is already assigned to the user
    const alreadyAssigned = userRoles.some(
      ur => ur.user === selectedUser && ur.role === selectedRole
    );
    
    if (alreadyAssigned) {
      enqueueSnackbar('This role is already assigned to the user', { variant: 'warning' });
      return;
    }

    try {
      await apiService.post('/api/users/user-roles/', {
        user: selectedUser,
        role: selectedRole
      });
      
      enqueueSnackbar('Role assigned successfully', { variant: 'success' });
      fetchUserRoles();
      setOpenAssignRole(false);
    } catch (error) {
      console.error('Error assigning role:', error);
      
      // Check if this is a uniqueness error
      const axiosError = error as any;
      if (axiosError?.response?.data?.non_field_errors?.includes('The fields user, role must make a unique set.')) {
        enqueueSnackbar('This role is already assigned to the user', { variant: 'warning' });
      } else {
        enqueueSnackbar('Failed to assign role', { variant: 'error' });
      }
    }
  };

  // Create new role
  const handleCreateRole = async () => {
    if (!newRoleData.name) {
      enqueueSnackbar('Role name is required', { variant: 'warning' });
      return;
    }

    try {
      await apiService.post('/api/users/roles/', newRoleData);
      
      enqueueSnackbar('Role created successfully', { variant: 'success' });
      fetchRoles();
      setOpenCreateRole(false);
      setNewRoleData({
        name: '',
        role_type: 'custom',
        description: '',
        permissions: []
      });
    } catch (error) {
      console.error('Error creating role:', error);
      enqueueSnackbar('Failed to create role', { variant: 'error' });
    }
  };

  // Update existing role
  const handleUpdateRole = async () => {
    if (!selectedRoleData) return;

    try {
      await apiService.put(`/api/users/roles/${selectedRoleData.id}/`, selectedRoleData);
      
      enqueueSnackbar('Role updated successfully', { variant: 'success' });
      fetchRoles();
      setOpenEditRole(false);
    } catch (error) {
      console.error('Error updating role:', error);
      enqueueSnackbar('Failed to update role', { variant: 'error' });
    }
  };

  // Delete role
  const handleDeleteRole = async () => {
    if (!selectedRoleData) return;

    try {
      await apiService.delete(`/api/users/roles/${selectedRoleData.id}/`);
      
      enqueueSnackbar('Role deleted successfully', { variant: 'success' });
      fetchRoles();
      setOpenDeleteRole(false);
    } catch (error) {
      console.error('Error deleting role:', error);
      enqueueSnackbar('Failed to delete role', { variant: 'error' });
    }
  };

  // Remove role from user
  const handleRemoveUserRole = async () => {
    if (!userRoleToRemove) return;
    
    try {
      await apiService.delete(`/api/users/user-roles/${userRoleToRemove.id}/`);
      
      enqueueSnackbar(`Role "${userRoleToRemove.roleName}" removed from user "${userRoleToRemove.userName}"`, { variant: 'success' });
      fetchUserRoles();
      setOpenRemoveUserRole(false);
      setUserRoleToRemove(null);
    } catch (error) {
      console.error('Error removing user role:', error);
      enqueueSnackbar('Failed to remove role assignment', { variant: 'error' });
    }
  };

  const handleOpenRemoveUserRole = (userRoleId: number, roleName: string, userId: number) => {
    const userName = getUsernameById(userId);
    setUserRoleToRemove({ id: userRoleId, roleName, userName });
    setOpenRemoveUserRole(true);
  };

  // Toggle permission in role creation/editing
  const handleTogglePermission = (permission: string, isNewRole: boolean = true) => {
    if (isNewRole) {
      setNewRoleData(prev => {
        const hasPermission = prev.permissions.includes(permission);
        if (hasPermission) {
          return {
            ...prev,
            permissions: prev.permissions.filter(p => p !== permission)
          };
        } else {
          return {
            ...prev,
            permissions: [...prev.permissions, permission]
          };
        }
      });
    } else if (selectedRoleData) {
      setSelectedRoleData(prev => {
        if (!prev) return null;
        
        const hasPermission = prev.permissions.includes(permission);
        if (hasPermission) {
          return {
            ...prev,
            permissions: prev.permissions.filter(p => p !== permission)
          };
        } else {
          return {
            ...prev,
            permissions: [...prev.permissions, permission]
          };
        }
      });
    }
  };

  // Dialog handlers
  const handleOpenAssignRole = () => {
    setSelectedUser(null);
    setSelectedRole(null);
    setOpenAssignRole(true);
  };

  const handleOpenEditRole = (role: Role) => {
    setSelectedRoleData(role);
    setOpenEditRole(true);
  };

  const handleOpenCreateRole = () => {
    setNewRoleData({
      name: '',
      role_type: 'custom',
      description: '',
      permissions: []
    });
    setOpenCreateRole(true);
  };

  const handleOpenDeleteRole = (role: Role) => {
    setSelectedRoleData(role);
    setOpenDeleteRole(true);
  };

  // Input handlers
  const handleNewRoleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewRoleData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditRoleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!selectedRoleData) return;
    
    const { name, value } = e.target;
    setSelectedRoleData(prev => {
      if (!prev) return null;
      return { ...prev, [name]: value };
    });
  };

  // Get user name by ID
  const getUsernameById = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user ? user.username : 'Unknown User';
  };

  // Get role name by ID
  const getRoleNameById = (roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Unknown Role';
  };

  // Get user roles (including system roles)
  const getUserRoles = (userId: number) => {
    // Get custom roles from the database
    const customRoles = userRoles.filter(ur => ur.user === userId);
    
    // Find the user
    const user = users.find(u => u.id === userId);
    if (!user) return customRoles;
    
    // Add system roles (which aren't stored in the roles table)
    const systemRoles = [];
    
    return customRoles;
  };

  // Get all roles (including system roles)
  const getAllRoles = () => {
    // Add system roles that aren't in the database
    const systemRoles = [
      {
        id: -1, // Use negative IDs for system roles to avoid conflicts
        name: "Superuser",
        role_type: "system",
        description: "Full system access with all permissions",
        is_active: true,
        permissions: permissionCategories.flatMap(cat => cat.permissions)
      },
      {
        id: -2,
        name: "Admin",
        role_type: "system",
        description: "Administrative access with elevated permissions",
        is_active: true,
        permissions: permissionCategories.flatMap(cat => cat.permissions)
      }
    ];
    
    // Combine with custom roles
    return [...systemRoles, ...roles];
  };

  // Get user permissions through roles
  const getUserPermissions = (userId: number) => {
    const userRolesList = getUserRoles(userId);
    const roleIds = userRolesList.map(ur => ur.role);
    
    // Get all permissions from all roles
    const rolePermissions = roles
      .filter(role => roleIds.includes(role.id))
      .flatMap(role => role.permissions);
      
    // Get direct user permissions
    const directPermissions = permissions
      .filter(perm => perm.user === userId)
      .map(perm => perm.permission_type);
      
    // Combine and remove duplicates
    return [...new Set([...rolePermissions, ...directPermissions])];
  };

  // Get direct user permissions (not through roles)
  const getDirectUserPermissions = (userId: number) => {
    return permissions
      .filter(perm => perm.user === userId)
      .map(perm => perm.permission_type);
  };
  
  // Get permissions from roles
  const getRolePermissions = (userId: number) => {
    const userRolesList = getUserRoles(userId);
    const roleIds = userRolesList.map(ur => ur.role);
    
    // Get role objects
    const userRoles = roles.filter(role => roleIds.includes(role.id));
    
    // Create a map of permissions to the roles that grant them
    const permissionToRoles: Record<string, string[]> = {};
    
    userRoles.forEach(role => {
      role.permissions.forEach(permission => {
        if (!permissionToRoles[permission]) {
          permissionToRoles[permission] = [];
        }
        permissionToRoles[permission].push(role.name);
      });
    });
    
    return permissionToRoles;
  };
  
  // Filter functions
  const filterUsers = (users: User[]) => {
    if (!userSearchTerm) return users;
    
    const searchTermLower = userSearchTerm.toLowerCase();
    return users.filter(user => 
      user.username.toLowerCase().includes(searchTermLower) || 
      user.email.toLowerCase().includes(searchTermLower)
    );
  };
  
  const filterRoles = (roles: Role[]) => {
    if (!roleSearchTerm) return roles;
    
    const searchTermLower = roleSearchTerm.toLowerCase();
    return roles.filter(role => 
      role.name.toLowerCase().includes(searchTermLower) || 
      role.description.toLowerCase().includes(searchTermLower)
    );
  };
  
  // Filter permissions by search term
  const filterPermissionCategories = (categories: typeof permissionCategories) => {
    if (!permissionFilter) return categories;
    
    const filterLower = permissionFilter.toLowerCase();
    
    return categories
      .map(category => ({
        ...category,
        permissions: category.permissions.filter(permission => 
          permission.toLowerCase().includes(filterLower) || 
          permissionDisplayNames[permission].toLowerCase().includes(filterLower)
        )
      }))
      .filter(category => category.permissions.length > 0);
  };

  // Update system role (is_staff, is_superuser)
  const handleUpdateSystemRole = async (userId: number, roleType: 'admin' | 'superuser', enabled: boolean) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      const updateData = {
        ...(roleType === 'admin' ? { is_staff: enabled } : {}),
        ...(roleType === 'superuser' ? { is_superuser: enabled } : {})
      };
      
      await apiService.patch(`/api/users/users/${userId}/`, updateData);
      
      enqueueSnackbar(`${roleType === 'admin' ? 'Admin' : 'Superuser'} role ${enabled ? 'assigned to' : 'removed from'} ${user.username}`, { 
        variant: 'success' 
      });
      
      fetchUsers();
    } catch (error) {
      console.error(`Error updating ${roleType} role:`, error);
      enqueueSnackbar(`Failed to update ${roleType} role`, { variant: 'error' });
    }
  };

  if (!isAdmin) {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          m: 4, 
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Typography variant="h6">Access Denied</Typography>
        <Typography>You do not have permission to access this page. Admin privileges are required.</Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        User Roles & Permissions
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="permissions tabs">
            <Tab label="User Roles" {...a11yProps(0)} />
            <Tab label="Manage Roles" {...a11yProps(1)} />
            <Tab label="Permissions Matrix" {...a11yProps(2)} />
          </Tabs>
        </Box>
        
        {/* User Roles Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '60%' }}>
              <TextField
                placeholder="Search users..."
                variant="outlined"
                size="small"
                fullWidth
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
                  endAdornment: userSearchTerm ? (
                    <IconButton 
                      size="small" 
                      onClick={() => setUserSearchTerm('')}
                      aria-label="clear search"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null
                }}
              />
            </Box>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={handleOpenAssignRole}
            >
              Assign Role
            </Button>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>System Roles</TableCell>
                  <TableCell>Custom Roles</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <CircularProgress size={24} sx={{ my: 2 }} />
                    </TableCell>
                  </TableRow>
                ) : (
                  filterUsers(users).map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        {user.username}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {/* System roles */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={user.is_superuser}
                                onChange={(e) => handleUpdateSystemRole(user.id, 'superuser', e.target.checked)}
                                size="small"
                              />
                            }
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2">Superuser</Typography>
                                {user.is_superuser && (
                                  <Chip 
                                    label="Active" 
                                    color="warning" 
                                    size="small" 
                                    sx={{ ml: 1 }} 
                                  />
                                )}
                              </Box>
                            }
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={user.is_staff}
                                onChange={(e) => handleUpdateSystemRole(user.id, 'admin', e.target.checked)}
                                size="small"
                              />
                            }
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2">Admin</Typography>
                                {user.is_staff && (
                                  <Chip 
                                    label="Active" 
                                    color="primary" 
                                    size="small" 
                                    sx={{ ml: 1 }} 
                                  />
                                )}
                              </Box>
                            }
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {/* Custom roles */}
                        {getUserRoles(user.id).length > 0 ? (
                          getUserRoles(user.id).map(userRole => (
                            <Chip 
                              key={userRole.id}
                              label={getRoleNameById(userRole.role)}
                              color="primary"
                              variant="outlined"
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                              onDelete={() => handleOpenRemoveUserRole(userRole.id, getRoleNameById(userRole.role), userRole.user)}
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No custom roles assigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          variant="outlined"
                          onClick={() => {
                            setSelectedUser(user.id);
                            setOpenAssignRole(true);
                          }}
                        >
                          Assign Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
        
        {/* Manage Roles Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '60%' }}>
              <TextField
                placeholder="Search roles..."
                variant="outlined"
                size="small"
                fullWidth
                value={roleSearchTerm}
                onChange={(e) => setRoleSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
                  endAdornment: roleSearchTerm ? (
                    <IconButton 
                      size="small" 
                      onClick={() => setRoleSearchTerm('')}
                      aria-label="clear search"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null
                }}
              />
            </Box>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={handleOpenCreateRole}
            >
              Create Role
            </Button>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Role Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <CircularProgress size={24} sx={{ my: 2 }} />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* System Roles (displayed first, can't be edited) */}
                    <TableRow>
                      <TableCell>Superuser</TableCell>
                      <TableCell>
                        <Chip 
                          label="System" 
                          size="small" 
                          color="warning" 
                        />
                      </TableCell>
                      <TableCell>Full system access with all permissions</TableCell>
                      <TableCell>
                        <Chip 
                          label="All permissions" 
                          size="small" 
                          color="info" 
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          System role
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Admin</TableCell>
                      <TableCell>
                        <Chip 
                          label="System" 
                          size="small" 
                          color="primary" 
                        />
                      </TableCell>
                      <TableCell>Administrative access with elevated permissions</TableCell>
                      <TableCell>
                        <Chip 
                          label="Administrative permissions" 
                          size="small" 
                          color="info" 
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          System role
                        </Typography>
                      </TableCell>
                    </TableRow>
                    
                    {/* Custom Roles */}
                    {filterRoles(roles).map(role => (
                      <TableRow key={role.id}>
                        <TableCell>{role.name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={role.role_type.charAt(0).toUpperCase() + role.role_type.slice(1)} 
                            size="small" 
                            color="primary" 
                          />
                        </TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell>
                          {role.permissions.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              <Chip 
                                label={`${role.permissions.length} permissions`} 
                                size="small" 
                                color="info" 
                              />
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No permissions
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleOpenEditRole(role)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleOpenDeleteRole(role)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
        
        {/* Permissions Matrix Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              User Permissions Matrix
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="matrix-user-select-label">Select User</InputLabel>
                  <Select
                    labelId="matrix-user-select-label"
                    value={selectedUserForMatrix ? String(selectedUserForMatrix) : ''}
                    label="Select User"
                    onChange={(e) => handleSelectUserForMatrix(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>None (show all permissions)</em>
                    </MenuItem>
                    {users.map(user => (
                      <MenuItem key={user.id} value={String(user.id)}>
                        {user.username}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  placeholder="Filter permissions..."
                  variant="outlined"
                  value={permissionFilter}
                  onChange={(e) => setPermissionFilter(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
                    endAdornment: permissionFilter ? (
                      <IconButton 
                        size="small" 
                        onClick={() => setPermissionFilter('')}
                        aria-label="clear filter"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ) : null
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          {selectedUserForMatrix ? (
            <UserPermissionsView 
              userId={selectedUserForMatrix}
              userName={getUsernameById(selectedUserForMatrix)}
              directPermissions={getDirectUserPermissions(selectedUserForMatrix)}
              rolePermissions={getRolePermissions(selectedUserForMatrix)}
              permissionCategories={filterPermissionCategories(permissionCategories)}
              permissionDisplayNames={permissionDisplayNames}
            />
          ) : (
            <AllPermissionsView 
              permissionCategories={filterPermissionCategories(permissionCategories)}
              permissionDisplayNames={permissionDisplayNames}
            />
          )}
        </TabPanel>
      </Paper>
      
      {/* Assign Role Dialog */}
      <Dialog open={openAssignRole} onClose={() => setOpenAssignRole(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Role to User</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="assign-user-label">User</InputLabel>
              <Select
                labelId="assign-user-label"
                value={selectedUser ? String(selectedUser) : ''}
                label="User"
                onChange={(e) => setSelectedUser(e.target.value ? Number(e.target.value) : null)}
              >
                {users.map(user => (
                  <MenuItem key={user.id} value={String(user.id)}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel id="assign-role-label">Role</InputLabel>
              <Select
                labelId="assign-role-label"
                value={selectedRole ? String(selectedRole) : ''}
                label="Role"
                onChange={(e) => setSelectedRole(e.target.value ? Number(e.target.value) : null)}
              >
                {roles.map(role => (
                  <MenuItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignRole(false)}>Cancel</Button>
          <Button onClick={handleAssignRole} variant="contained" color="primary">
            Assign
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Create Role Dialog */}
      <Dialog open={openCreateRole} onClose={() => setOpenCreateRole(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Role</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Role Name"
                value={newRoleData.name}
                onChange={handleNewRoleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="role_type"
                label="Role Type"
                select
                value={newRoleData.role_type}
                onChange={handleNewRoleInputChange}
                fullWidth
              >
                <MenuItem value="admin">Administrator</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="accountant">Accountant</MenuItem>
                <MenuItem value="sales_agent">Sales Agent</MenuItem>
                <MenuItem value="inventory_clerk">Inventory Clerk</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
                <MenuItem value="custom">Custom Role</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                value={newRoleData.description}
                onChange={handleNewRoleInputChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Permissions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {permissionCategories.map(category => (
                <Accordion key={category.name} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography component="div">{category.name}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {category.permissions.map(permission => (
                        <Grid item xs={12} sm={6} key={permission}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={newRoleData.permissions.includes(permission)}
                                onChange={() => handleTogglePermission(permission)}
                              />
                            }
                            label={permissionDisplayNames[permission]}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateRole(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateRole} 
            variant="contained" 
            color="primary"
            disabled={!newRoleData.name}
          >
            Create Role
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Role Dialog */}
      <Dialog open={openEditRole} onClose={() => setOpenEditRole(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Role</DialogTitle>
        <DialogContent>
          {selectedRoleData && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="name"
                  label="Role Name"
                  value={selectedRoleData.name}
                  onChange={handleEditRoleInputChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="role_type"
                  label="Role Type"
                  select
                  value={selectedRoleData.role_type}
                  onChange={handleEditRoleInputChange}
                  fullWidth
                >
                  <MenuItem value="admin">Administrator</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="accountant">Accountant</MenuItem>
                  <MenuItem value="sales_agent">Sales Agent</MenuItem>
                  <MenuItem value="inventory_clerk">Inventory Clerk</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                  <MenuItem value="custom">Custom Role</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="description"
                  label="Description"
                  value={selectedRoleData.description}
                  onChange={handleEditRoleInputChange}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Permissions
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {permissionCategories.map(category => (
                  <Accordion key={category.name} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography component="div">{category.name}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {category.permissions.map(permission => (
                          <Grid item xs={12} sm={6} key={permission}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={selectedRoleData.permissions.includes(permission)}
                                  onChange={() => handleTogglePermission(permission, false)}
                                />
                              }
                              label={permissionDisplayNames[permission]}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditRole(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateRole} 
            variant="contained" 
            color="primary"
            disabled={!selectedRoleData?.name}
          >
            Update Role
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Role Dialog */}
      <Dialog open={openDeleteRole} onClose={() => setOpenDeleteRole(false)}>
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the role "{selectedRoleData?.name}"? 
            This action cannot be undone.
          </Typography>
          {userRoles.some(ur => ur.role === selectedRoleData?.id) && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This role is currently assigned to users. Deleting it will remove 
              the role from all users.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteRole(false)}>Cancel</Button>
          <Button onClick={handleDeleteRole} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Remove User Role Confirmation Dialog */}
      <Dialog open={openRemoveUserRole} onClose={() => setOpenRemoveUserRole(false)}>
        <DialogTitle>Remove Role Assignment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove the role "{userRoleToRemove?.roleName}" from user "{userRoleToRemove?.userName}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRemoveUserRole(false)}>Cancel</Button>
          <Button onClick={handleRemoveUserRole} variant="contained" color="error">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Component to view permissions for a specific user
interface UserPermissionsViewProps {
  userId: number;
  userName: string;
  directPermissions: string[];
  rolePermissions: Record<string, string[]>;
  permissionCategories: typeof permissionCategories;
  permissionDisplayNames: Record<string, string>;
}

const UserPermissionsView: React.FC<UserPermissionsViewProps> = ({
  userId,
  userName,
  directPermissions,
  rolePermissions,
  permissionCategories,
  permissionDisplayNames
}) => {
  // Get all permissions this user has
  const allPermissions = [
    ...directPermissions,
    ...Object.keys(rolePermissions)
  ];
  
  // Remove duplicates
  const uniquePermissions = [...new Set(allPermissions)];
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Permissions for {userName}
      </Typography>
      
      {permissionCategories.map(category => (
        <Accordion key={category.name} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography component="div">
              {category.name}
              <Chip
                size="small"
                label={`${category.permissions.filter(p => uniquePermissions.includes(p)).length} / ${category.permissions.length}`}
                sx={{ ml: 2 }}
                color="primary"
              />
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Permission</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Source</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {category.permissions.map(permission => {
                    const hasDirectPermission = directPermissions.includes(permission);
                    const hasRolePermission = permission in rolePermissions;
                    const hasPermission = hasDirectPermission || hasRolePermission;
                    
                    return (
                      <TableRow key={permission}>
                        <TableCell>{permissionDisplayNames[permission]}</TableCell>
                        <TableCell>
                          {hasPermission ? (
                            <Chip
                              size="small"
                              label="Granted"
                              color="success"
                            />
                          ) : (
                            <Chip
                              size="small"
                              label="Not granted"
                              color="default"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {hasDirectPermission && (
                            <Chip
                              size="small"
                              label="Direct"
                              color="primary"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          )}
                          {hasRolePermission && rolePermissions[permission].map(roleName => (
                            <Chip
                              key={roleName}
                              size="small"
                              label={`Role: ${roleName}`}
                              color="secondary"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

// Component to view all permissions
interface AllPermissionsViewProps {
  permissionCategories: typeof permissionCategories;
  permissionDisplayNames: Record<string, string>;
}

const AllPermissionsView: React.FC<AllPermissionsViewProps> = ({
  permissionCategories,
  permissionDisplayNames
}) => {
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        All Available Permissions
      </Typography>
      
      {permissionCategories.map(category => (
        <Accordion key={category.name} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography component="div">{category.name}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {category.permissions.map(permission => (
                <Grid item xs={12} sm={6} md={4} key={permission}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      display: 'flex', 
                      flexDirection: 'column',
                      height: '100%'
                    }}
                    elevation={1}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      {permissionDisplayNames[permission]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Permission code: <code>{permission}</code>
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default PermissionsPage;



