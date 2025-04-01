import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const NoAccess: React.FC = () => {
  const { logout } = useAuth();

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom color="error">
            Access Denied
          </Typography>
          <Typography variant="body1" gutterBottom>
            You do not have the necessary permissions to access this application.
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Please contact the system administrator if you believe this is an error.
          </Typography>
          <Button variant="contained" color="primary" onClick={logout}>
            Logout
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default NoAccess; 