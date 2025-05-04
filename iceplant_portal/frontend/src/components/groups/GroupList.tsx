import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemButton,
  IconButton,
  Typography
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Group as GroupIcon
} from '@mui/icons-material';

interface Group {
  id: number;
  name: string;
  user_count: number;
}

interface GroupListProps {
  groups: Group[];
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  selectedId?: number | null;
}

const GroupList: React.FC<GroupListProps> = ({ groups, onSelect, onDelete, selectedId }) => {
  return (
    <List>
      {groups.length === 0 && (
        <ListItem>
          <Typography color="text.secondary">No groups found</Typography>
        </ListItem>
      )}      {groups.map((group) => (
        <ListItem 
          key={group.id}
          disablePadding
        >
          <ListItemButton
            onClick={() => onSelect(group.id)}
            selected={selectedId === group.id}
            sx={{ 
              borderRadius: 1,
              mb: 0.5,
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                '&:hover': {
                  backgroundColor: 'primary.light',
                },
              }
            }}
          >
            <GroupIcon sx={{ mr: 2, color: 'primary.main' }} />
            <ListItemText 
              primary={group.name} 
              secondary={`${group.user_count} user${group.user_count !== 1 ? 's' : ''}`} 
            />
          </ListItemButton>
          <ListItemSecondaryAction>
            <IconButton 
              edge="end" 
              aria-label="delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(group.id);
              }}
              size="small"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
};

export default GroupList;
