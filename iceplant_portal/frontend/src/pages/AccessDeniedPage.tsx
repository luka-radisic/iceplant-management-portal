import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Container,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LockIcon from '@mui/icons-material/Lock';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import HelpIcon from '@mui/icons-material/Help';

const AccessDeniedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Container maxWidth="md">
      <Paper 
        elevation={3} 
        sx={{ 
          mt: 8, 
          mb: 4, 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <LockIcon color="error" sx={{ fontSize: 100, mb: 2 }} />
        
        <Typography variant="h4" component="h1" gutterBottom>
          Access Denied
        </Typography>
        
        <Typography variant="body1" paragraph>
          You don't have permission to access this page.
        </Typography>
        
        {user && user.group && (
          <Alert severity="info" sx={{ width: '100%', mt: 2, mb: 2 }}>
            <Typography variant="body2">
              Your current group: <strong>{user.group}</strong>
            </Typography>
            {user.groups && user.groups.length > 0 && (
              <Typography variant="body2">
                All your groups: <strong>{user.groups.join(', ')}</strong>
              </Typography>
            )}
          </Alert>
        )}
        
        <Box sx={{ mt: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/')}
          >
            Return to Dashboard
          </Button>
          
          <Button 
            variant="outlined"
            color="secondary"
            startIcon={<HelpIcon />}
            onClick={() => navigate('/profile')}
          >
            View Your Permissions
          </Button>
          
          <Button 
            variant="outlined"
            color="error"
            startIcon={<ReportProblemIcon />}
            onClick={() => {
              // This could be implemented to send an email or open a ticket
              alert('Access issue reported. An administrator will be notified.');
            }}
          >
            Report Access Issue
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AccessDeniedPage;
