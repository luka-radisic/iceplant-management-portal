import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Container,
  Grid
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  VerifiedUser as VerifiedUserIcon,
  Security as SecurityIcon,
  Folder as FolderIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

interface UserPermissions {
  username: string;
  email: string;
  full_name: string;
  is_superuser: boolean;
  is_staff: boolean;
  groups: string[];
  module_access: Record<string, boolean>;
  permissions: Record<string, boolean>;
}

const UserProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const response = await apiService.get('/api/users/me/permissions/');
        setPermissions(response.data);
      } catch (err) {
        console.error('Error fetching permissions:', err);
        setError('Failed to load permissions data');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Your Profile
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PersonIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h5">{permissions?.full_name || user?.full_name || user?.username}</Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  User Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText primary="Username" secondary={permissions?.username || user?.username} />
                  </ListItem>                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon />
                    </ListItemIcon>
                    <ListItemText primary="Email" secondary={permissions?.email || "Not available"} />
                  </ListItem>
                  {(permissions?.is_superuser || user?.isSuperuser) && (
                    <ListItem>
                      <ListItemIcon>
                        <SecurityIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Role" 
                        secondary={
                          <Chip 
                            label="Superuser" 
                            color="error" 
                            size="small" 
                            icon={<VerifiedUserIcon />} 
                          />
                        } 
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  Groups & Permissions
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  Your Groups:
                </Typography>
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {permissions?.groups && permissions.groups.length > 0 ? (
                    permissions.groups.map(group => (
                      <Chip 
                        key={group} 
                        label={group} 
                        color="primary" 
                        variant="outlined" 
                        size="small" 
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      You are not assigned to any groups.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  Module Access
                </Typography>
                <Grid container spacing={1}>
                  {permissions?.module_access && Object.entries(permissions.module_access).map(([module, hasAccess]) => (
                    <Grid item xs={6} sm={4} md={3} key={module}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          textAlign: 'center',
                          backgroundColor: hasAccess ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                          border: hasAccess ? '1px solid #4caf50' : '1px solid #f44336',
                          borderRadius: 2
                        }}
                      >
                        <FolderIcon color={hasAccess ? "success" : "error"} />
                        <Typography variant="body2" color="text.secondary">
                          {module}
                        </Typography>
                        <Chip 
                          size="small"
                          label={hasAccess ? "Access" : "No Access"} 
                          color={hasAccess ? "success" : "error"}
                          sx={{ mt: 1, fontSize: '0.7rem' }}
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default UserProfilePage;
