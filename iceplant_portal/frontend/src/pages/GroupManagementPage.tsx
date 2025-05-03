import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tab, 
  Tabs,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import apiService from '../services/api';
import { endpoints } from '../services/endpoints';
import { useSnackbar } from 'notistack';

// Components
import GroupList from '../components/groups/GroupList';
import GroupDetails from '../components/groups/GroupDetails';
import UsersList from '../components/groups/UsersList';
import AssignGroupsDialog from '../components/groups/AssignGroupsDialog';

// Interface for our Group data
interface Group {
  id: number;
  name: string;
  user_count: number;
}

// Interface for detailed group data
interface GroupDetail extends Group {
  users: {
    id: number;
    username: string;
    full_name: string;
  }[];
  permissions: Record<string, boolean>;
}

// Interface for User data
interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  groups: string[];
}

// Tabs interface
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
      id={`group-management-tabpanel-${index}`}
      aria-labelledby={`group-management-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const GroupManagementPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  // Load groups on component mount
  useEffect(() => {
    fetchGroups();
  }, []);

  // Load users when switching to the Users tab
  useEffect(() => {
    if (tabValue === 1 && users.length === 0) {
      fetchUsers();
    }
  }, [tabValue]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await apiService.get(endpoints.groups);
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      enqueueSnackbar('Failed to load groups', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetails = async (groupId: number) => {
    setLoading(true);
    try {
      const response = await apiService.get(`${endpoints.groups}${groupId}/`);
      setSelectedGroup(response.data);
    } catch (error) {
      console.error(`Error fetching group details for group ${groupId}:`, error);
      enqueueSnackbar('Failed to load group details', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiService.get(endpoints.userManagement);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      enqueueSnackbar('Failed to load users', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleGroupSelect = (groupId: number) => {
    fetchGroupDetails(groupId);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      enqueueSnackbar('Group name cannot be empty', { variant: 'warning' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiService.post(endpoints.groups, { name: newGroupName });
      enqueueSnackbar('Group created successfully', { variant: 'success' });
      setGroups([...groups, response.data]);
      setNewGroupName('');
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating group:', error);
      enqueueSnackbar('Failed to create group', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      setLoading(true);
      try {
        await apiService.delete(`${endpoints.groups}${groupId}/`);
        setGroups(groups.filter(group => group.id !== groupId));
        if (selectedGroup?.id === groupId) {
          setSelectedGroup(null);
        }
        enqueueSnackbar('Group deleted successfully', { variant: 'success' });
      } catch (error) {
        console.error(`Error deleting group ${groupId}:`, error);
        enqueueSnackbar('Failed to delete group', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditGroup = async (groupId: number, newName: string) => {
    setLoading(true);
    try {
      const response = await apiService.put(`${endpoints.groups}${groupId}/`, { name: newName });
      // Update groups list
      setGroups(groups.map(group => group.id === groupId ? { ...group, name: newName } : group));
      // Update selected group if this is the one being edited
      if (selectedGroup && selectedGroup.id === groupId) {
        setSelectedGroup({ ...selectedGroup, name: newName });
      }
      enqueueSnackbar('Group updated successfully', { variant: 'success' });
    } catch (error) {
      console.error(`Error updating group ${groupId}:`, error);
      enqueueSnackbar('Failed to update group', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUsersToGroup = async (groupId: number, userIds: number[]) => {
    setLoading(true);
    try {
      await apiService.post(endpoints.addUsersToGroup(groupId), { user_ids: userIds });
      // Refresh group details
      fetchGroupDetails(groupId);
      enqueueSnackbar('Users added to group successfully', { variant: 'success' });
    } catch (error) {
      console.error(`Error adding users to group ${groupId}:`, error);
      enqueueSnackbar('Failed to add users to group', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUsersFromGroup = async (groupId: number, userIds: number[]) => {
    setLoading(true);
    try {
      await apiService.post(endpoints.removeUsersFromGroup(groupId), { user_ids: userIds });
      // Refresh group details
      fetchGroupDetails(groupId);
      enqueueSnackbar('Users removed from group successfully', { variant: 'success' });
    } catch (error) {
      console.error(`Error removing users from group ${groupId}:`, error);
      enqueueSnackbar('Failed to remove users from group', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignGroups = async (userId: number, groupIds: number[]) => {
    setLoading(true);
    try {
      await apiService.post(endpoints.assignGroups, { 
        user_id: userId,
        group_ids: groupIds
      });
      
      // Refresh users list to update groups
      fetchUsers();
      setAssignDialogOpen(false);
      enqueueSnackbar('Groups assigned successfully', { variant: 'success' });
    } catch (error) {
      console.error(`Error assigning groups to user ${userId}:`, error);
      enqueueSnackbar('Failed to assign groups', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openAssignDialog = (user: User) => {
    setSelectedUser(user);
    setAssignDialogOpen(true);
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Group & Permission Management
      </Typography>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="group management tabs">
          <Tab label="Groups" />
          <Tab label="Users" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box display="flex" sx={{ minHeight: '600px' }}>
            <Box sx={{ width: '30%', borderRight: '1px solid #eee', pr: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Group List
                </Typography>
                <Button 
                  startIcon={<AddIcon />} 
                  variant="contained" 
                  color="primary"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  New Group
                </Button>
              </Box>
              
              {loading && !groups.length ? (
                <CircularProgress />
              ) : (
                <GroupList 
                  groups={groups} 
                  onSelect={handleGroupSelect} 
                  onDelete={handleDeleteGroup}
                  selectedId={selectedGroup?.id}
                />
              )}
            </Box>
            
            <Box sx={{ width: '70%', pl: 3 }}>
              {selectedGroup ? (
                <GroupDetails 
                  group={selectedGroup} 
                  onEditName={handleEditGroup}
                  onAddUsers={handleAddUsersToGroup}
                  onRemoveUsers={handleRemoveUsersFromGroup}
                  allUsers={users}
                />
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                  <Typography color="text.secondary">
                    Select a group to view details
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {loading && !users.length ? (
            <CircularProgress />
          ) : (
            <UsersList 
              users={users} 
              groups={groups}
              onAssignGroups={openAssignDialog} 
            />
          )}
        </TabPanel>
      </Paper>

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            type="text"
            fullWidth
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateGroup} 
            color="primary" 
            disabled={loading || !newGroupName.trim()}
          >
            {loading ? <CircularProgress size={24} /> : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Groups Dialog */}
      {selectedUser && (
        <AssignGroupsDialog 
          open={assignDialogOpen}
          user={selectedUser}
          groups={groups}
          onClose={() => setAssignDialogOpen(false)}
          onAssign={(groupIds) => handleAssignGroups(selectedUser.id, groupIds)}
          loading={loading}
        />
      )}
    </Box>
  );
};

export default GroupManagementPage;
