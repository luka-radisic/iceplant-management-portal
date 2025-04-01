import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Container,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { CompanySettings, defaultCompanySettings } from '../types/company';

export default function Login() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { login: authLogin } = useAuth();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  // Fetch company settings to get the logo
  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const response = await apiService.getCompanySettings();
        setCompanySettings(response);
      } catch (err) {
        console.error('Error fetching company settings:', err);
        // Use default settings if fetch fails
        setCompanySettings(defaultCompanySettings);
      }
    };

    fetchCompanySettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.login(formData.username, formData.password);
      console.log('Login response:', response);
      
      authLogin({
        token: response.token,
        user: {
          id: response.user?.id || 0,
          username: response.user?.username || formData.username,
          email: response.user?.email || '',
          is_staff: response.user?.is_staff || false,
          is_superuser: response.user?.is_superuser || false,
        },
      });
      enqueueSnackbar('Login successful', { variant: 'success' });
      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response?.status === 400) {
        setError('Invalid username or password');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        background: theme.palette.grey[100],
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={6}
          sx={{
            padding: isSmallScreen ? 2 : 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: '8px',
          }}
        >
          {/* Company Logo */}
          {companySettings.logo_url && (
            <Box
              component="img"
              src={companySettings.logo_url}
              alt="Company Logo"
              sx={{
                maxWidth: '80%',
                maxHeight: '120px',
                mb: 2,
                objectFit: 'contain',
              }}
            />
          )}
          
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            {companySettings.company_name || 'Ice Plant Management Portal'}
          </Typography>
          
          <Typography component="h2" variant="h6" color="textSecondary" gutterBottom>
            Sign In
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </Box>
          
          {companySettings.company_name && (
            <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 2 }}>
              © {new Date().getFullYear()} {companySettings.company_name}
            </Typography>
          )}
        </Paper>
      </Container>
    </Box>
  );
} 