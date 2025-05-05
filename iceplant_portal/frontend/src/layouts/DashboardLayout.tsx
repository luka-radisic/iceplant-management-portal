import {
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  Receipt as ExpensesIcon,
  Inventory as InventoryIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  People as PeopleIcon,
  ShoppingCart as SalesIcon,
  Build as ToolsIcon,
  AdminPanelSettings as AdminIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  ConstructionOutlined as BuildIcon,
} from '@mui/icons-material';
import GroupAwareNavigation from '../components/GroupAwareNavigation';
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

// Define all navigation items with their access requirements
const navigationItems = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/'
  },
  {
    text: 'Attendance',
    icon: <PeopleIcon />,
    path: '/attendance',
    requiredModules: ['attendance'],
    requiredGroups: ['HR', 'Managers', 'Admins']
  },
  {
    text: 'Sales',
    icon: <SalesIcon />,
    path: '/sales',
    requiredModules: ['sales'],
    requiredGroups: ['Sales', 'Accounting', 'Managers', 'Admins']
  },
  {
    text: 'Buyers',
    icon: <BusinessIcon />,
    path: '/buyers',
    requiredModules: ['buyers'],
    requiredGroups: ['Sales', 'Accounting', 'Managers', 'Admins']
  },
  {
    text: 'Inventory',
    icon: <InventoryIcon />,
    path: '/inventory',
    requiredModules: ['inventory'],
    requiredGroups: ['Inventory', 'Operations', 'Managers', 'Admins']
  },
  {
    text: 'Expenses',
    icon: <ExpensesIcon />,
    path: '/expenses',
    requiredModules: ['expenses'],
    requiredGroups: ['Accounting', 'Finance', 'Managers', 'Admins']
  },
  {
    text: 'Maintenance',
    icon: <BuildIcon />,
    path: '/maintenance',
    requiredModules: ['maintenance'],
    requiredGroups: ['Maintenance', 'Operations', 'Managers', 'Admins']
  },
  {
    text: 'Tools',
    icon: <ToolsIcon />,
    path: '/tools',
    superuserOnly: true
  },  {
    text: 'Company Settings',
    icon: <SettingsIcon />,
    path: '/company-settings',
    superuserOnly: true
  },
  {
    text: 'Group Management',
    icon: <AdminIcon />,
    path: '/group-management',
    superuserOnly: true
  },
];

export default function DashboardLayout() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [forceUpdate, setForceUpdate] = useState(0);

  // Check if user is a superuser
  const isSuperuser = user?.isSuperuser === true;
  console.log('[DashboardLayout] isSuperuser:', isSuperuser); // Add console log
  
  // Listen for auth-change events to update the navigation
  useEffect(() => {
    const handleAuthChange = () => {
      console.log('[DashboardLayout] Auth change detected, updating navigation');
      setForceUpdate(prev => prev + 1);
    };
    
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Company Management Portal
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {user?.group && (
                <Chip
                  label={user.group}
                  color="default"
                  sx={{
                    mr: 1.5,
                    fontWeight: 'bold',
                    letterSpacing: '0.3px',
                    px: 1,
                    borderRadius: '16px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    backgroundColor: '#ADD8E6',
                    color: '#000'
                  }}
                />
              )}              <Typography
                variant="body1"
                fontWeight="medium"
                noWrap
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate('/profile')}
              >
                {user?.full_name || user?.username}
              </Typography>
            </Box>
            <Button
              color="inherit"
              onClick={() => navigate('/profile')}
              sx={{ mr: 1 }}
            >
              My Profile
            </Button>
            <Button
              color="inherit"
              onClick={logout}
              startIcon={<LogoutIcon />}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          {/* Use GroupAwareNavigation to render navigation items */}
          <GroupAwareNavigation navigationItems={navigationItems} />
          <Divider />
        </Box>
      </Drawer>
      <Main open={open}>
        <Toolbar />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Outlet />
        </Container>
      </Main>
    </Box>
  );
}