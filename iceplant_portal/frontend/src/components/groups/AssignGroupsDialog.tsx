import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  CircularProgress,
  Typography,
  Divider,
  Box
} from '@mui/material';

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

interface Group {
  id: number;
  name: string;
  user_count: number;
}

interface AssignGroupsDialogProps {
  open: boolean;
  user: User;
  groups: Group[];
  onClose: () => void;
  onAssign: (groupIds: number[]) => void;
  loading: boolean;
}

const AssignGroupsDialog: React.FC<AssignGroupsDialogProps> = ({
  open,
  user,
  groups,
  onClose,
  onAssign,
  loading
}) => {
  // State to track which groups are selected
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  
  // Initialize selected groups based on user's current groups
  useEffect(() => {
    if (open && user) {
      const userGroupNames = user.groups || [];
      const userGroupIds = groups
        .filter(group => userGroupNames.includes(group.name))
        .map(group => group.id);
      
      setSelectedGroups(userGroupIds);
    }
  }, [open, user, groups]);
  
  const handleToggle = (groupId: number) => {
    const currentIndex = selectedGroups.indexOf(groupId);
    const newSelectedGroups = [...selectedGroups];
    
    if (currentIndex === -1) {
      // Add the group
      newSelectedGroups.push(groupId);
    } else {
      // Remove the group
      newSelectedGroups.splice(currentIndex, 1);
    }
    
    setSelectedGroups(newSelectedGroups);
  };
  
  const handleAssign = () => {
    onAssign(selectedGroups);
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={!loading ? onClose : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Manage Groups for {user?.full_name || user?.username}
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Select the groups this user should belong to:
        </Typography>
        
        <List>
          {groups.map((group) => (
            <ListItem 
              button 
              key={group.id}
              onClick={() => handleToggle(group.id)}
              disabled={loading}
            >
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={selectedGroups.indexOf(group.id) !== -1}
                  tabIndex={-1}
                  disableRipple
                />
              </ListItemIcon>
              <ListItemText 
                primary={group.name} 
                secondary={`${group.user_count} user${group.user_count !== 1 ? 's' : ''}`}
              />
            </ListItem>
          ))}
          
          {groups.length === 0 && (
            <ListItem>
              <ListItemText 
                primary="No groups available"
                secondary="Create groups first"
              />
            </ListItem>
          )}
        </List>
        
        <Box mt={2}>
          <Typography variant="caption" color="text.secondary">
            Note: Changes will take effect immediately. User group assignments determine what modules and functions they can access.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleAssign}
          color="primary"
          disabled={loading}
          startIcon={loading && <CircularProgress size={16} />}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignGroupsDialog;
