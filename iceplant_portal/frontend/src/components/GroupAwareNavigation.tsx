import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavigationItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  requiredGroups?: string[];
  requiredModules?: string[];
  adminOnly?: boolean;
  superuserOnly?: boolean;
}

interface GroupAwareNavigationProps {
  navigationItems: NavigationItem[];
}

const GroupAwareNavigation: React.FC<GroupAwareNavigationProps> = ({ navigationItems }) => {
  const { isAdmin, isSuperuser, user, hasAccess } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Helper function to check if user is in any of the required groups
  const isInGroup = (groups?: string[]) => {
    if (!groups || !groups.length || !user?.group) return false;
    return groups.includes(user.group);
  };
  
  // Filter navigation items based on user permissions
  const filteredItems = navigationItems.filter(item => {
    // Superuser can access everything
    if (isSuperuser) return true;
    
    // Check adminOnly flag
    if (item.adminOnly && !isAdmin) return false;
    
    // Check superuserOnly flag
    if (item.superuserOnly && !isSuperuser) return false;
    
    // Check required groups
    if (item.requiredGroups && item.requiredGroups.length > 0) {
      if (!isInGroup(item.requiredGroups)) return false;
    }
    
    // Check required modules
    if (item.requiredModules && item.requiredModules.length > 0) {
      const hasModuleAccess = item.requiredModules.some(module => hasAccess(module));
      if (!hasModuleAccess) return false;
    }
    
    return true;
  });
  
  return (
    <List>
      {filteredItems.map((item) => (
        <ListItemButton
          key={item.text}
          selected={location.pathname === item.path}
          onClick={() => navigate(item.path)}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.text} />
        </ListItemButton>
      ))}
    </List>
  );
};

export default GroupAwareNavigation;
