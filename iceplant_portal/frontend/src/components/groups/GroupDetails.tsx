import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

interface GroupUser {
  id: number;
  username: string;
  full_name: string;
}

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

interface GroupDetail {
  id: number;
  name: string;
  user_count: number;
  users: GroupUser[];
  permissions: Record<string, boolean>;
}

interface GroupDetailsProps {
  group: GroupDetail;
  onEditName: (id: number, name: string) => void;
  onAddUsers: (groupId: number, userIds: number[]) => void;
  onRemoveUsers: (groupId: number, userIds: number[]) => void;
  allUsers: User[];
}

const GroupDetails: React.FC<GroupDetailsProps> = ({ 
  group, 
  onEditName, 
  onAddUsers, 
  onRemoveUsers,
  allUsers 
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newName, setNewName] = useState(group.name);
  const [addUsersDialogOpen, setAddUsersDialogOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const handleEditSubmit = () => {
    onEditName(group.id, newName);
    setEditDialogOpen(false);
  };

  const handleAddUsersSubmit = () => {
    onAddUsers(group.id, selectedUserIds);
    setAddUsersDialogOpen(false);
    setSelectedUserIds([]);
  };

  const handleRemoveUser = (userId: number) => {
    onRemoveUsers(group.id, [userId]);
  };

  const handleSelectUser = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  // Filter out users already in the group
  const availableUsers = allUsers.filter(
    user => !group.users.some(groupUser => groupUser.id === user.id)
  );

  // Prepare module permissions for display
  const modulePermissions = Object.entries(group.permissions).map(([module, hasAccess]) => ({
    module,
    hasAccess
  }));

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">
          {group.name} 
        </Typography>
        <Button 
          startIcon={<EditIcon />} 
          variant="outlined"
          onClick={() => {
            setNewName(group.name);
            setEditDialogOpen(true);
          }}
        >
          Edit Name
        </Button>
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Module Access
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Module</TableCell>
              <TableCell>Has Access</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modulePermissions.map((item) => (
              <TableRow key={item.module}>
                <TableCell>
                  <Typography sx={{ textTransform: 'capitalize' }}>{item.module}</Typography>
                </TableCell>
                <TableCell>
                  {item.hasAccess ? 
                    <Chip 
                      icon={<CheckCircleIcon />} 
                      label="Yes" 
                      color="success" 
                      variant="outlined" 
                    /> : 
                    <Chip 
                      icon={<CancelIcon />} 
                      label="No" 
                      color="error" 
                      variant="outlined" 
                    />
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" gutterBottom>
          Group Members ({group.users.length})
        </Typography>
        <Button 
          startIcon={<PersonAddIcon />} 
          variant="outlined" 
          onClick={() => setAddUsersDialogOpen(true)}
        >
          Add Members
        </Button>
      </Box>

      {group.users.length === 0 ? (
        <Typography color="text.secondary">No users in this group</Typography>
      ) : (
        <List>
          {group.users.map((user) => (
            <ListItem key={user.id} divider>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                {user.full_name.charAt(0)}
              </Avatar>
              <ListItemText 
                primary={user.full_name} 
                secondary={`@${user.username}`} 
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  aria-label="delete"
                  onClick={() => handleRemoveUser(user.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Edit Name Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Group Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            type="text"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEditSubmit} 
            color="primary"
            disabled={!newName.trim() || newName === group.name}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Users Dialog */}
      <Dialog 
        open={addUsersDialogOpen} 
        onClose={() => setAddUsersDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Users to {group.name}</DialogTitle>
        <DialogContent>
          {availableUsers.length === 0 ? (
            <Typography color="text.secondary">All users are already in this group</Typography>
          ) : (
            <List>
              {availableUsers.map((user) => (
                <ListItem 
                  key={user.id} 
                  button
                  onClick={() => handleSelectUser(user.id)}
                  selected={selectedUserIds.includes(user.id)}
                >
                  <Avatar sx={{ mr: 2, bgcolor: selectedUserIds.includes(user.id) ? 'primary.main' : 'grey.400' }}>
                    {user.full_name.charAt(0)}
                  </Avatar>
                  <ListItemText 
                    primary={user.full_name} 
                    secondary={user.email || `@${user.username}`} 
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddUsersDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddUsersSubmit} 
            color="primary"
            disabled={selectedUserIds.length === 0}
          >
            Add Selected ({selectedUserIds.length})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupDetails;
