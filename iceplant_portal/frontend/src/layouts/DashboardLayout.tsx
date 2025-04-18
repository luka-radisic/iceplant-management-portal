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
  Lock as LockIcon,
  ConstructionOutlined as BuildIcon,
} from '@mui/icons-material';
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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

// Regular menu items for all users
const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Attendance', icon: <PeopleIcon />, path: '/attendance' },
  { text: 'Sales', icon: <SalesIcon />, path: '/sales' },
  { text: 'Buyers', icon: <BusinessIcon />, path: '/buyers' },
  { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory' },
  { text: 'Expenses', icon: <ExpensesIcon />, path: '/expenses' },
  { text: 'Maintenance', icon: <BuildIcon />, path: '/maintenance' },
];

// Superuser-only menu items
const superuserMenuItems = [
  { text: 'Tools', icon: <ToolsIcon />, path: '/tools' },
  { text: 'Company Settings', icon: <SettingsIcon />, path: '/company-settings' },
];

// Admin-only menu items
const adminMenuItems = [
  // { text: 'User Management', icon: <AdminIcon />, path: '/admin' },
  // { text: 'User Permissions', icon: <LockIcon />, path: '/admin/permissions' },
  // Moved to superuserMenuItems
];

export default function DashboardLayout() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  
  // Check if user is a superuser
  const isSuperuser = user?.is_superuser === true;

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
            Ice Plant Management Portal
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {user?.group && (
                <Chip 
                  label={user.group}
                  color={user.group === 'Admin' ? 'warning' : 'primary'}
                  sx={{ 
                    mr: 1.5,
                    fontWeight: 'bold',
                    letterSpacing: '0.3px',
                    px: 1,
                    borderRadius: '16px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
              )}
              <Typography variant="body1" fontWeight="medium" noWrap>
                {user?.full_name || user?.username}
              </Typography>
            </Box>
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
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          {isSuperuser && (
            <>
              <Divider />
              <List>
                <ListItem>
                  <Typography variant="overline" color="text.secondary">
                    Superuser Tools
                  </Typography>
                </ListItem>
                {superuserMenuItems.map((item) => (
                  <ListItem key={item.text} disablePadding>
                    <ListItemButton
                      selected={location.pathname === item.path}
                      onClick={() => navigate(item.path)}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}
          
          {isAdmin && adminMenuItems.length > 0 && (
            <>
              <Divider />
              <List>
                <ListItem>
                  <Typography variant="overline" color="text.secondary">
                    Administration
                  </Typography>
                </ListItem>
                {adminMenuItems.map((item) => (
                  <ListItem key={item.text} disablePadding>
                    <ListItemButton
                      selected={location.pathname === item.path}
                      onClick={() => navigate(item.path)}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}
          
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