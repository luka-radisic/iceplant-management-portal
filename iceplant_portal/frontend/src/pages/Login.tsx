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
import axios from 'axios';

// Fallback logo as base64 data URL in case the company logo fails to load
const fallbackLogoDataUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNDAgODAiIHdpZHRoPSIyNDAiIGhlaWdodD0iODAiPgogIDxzdHlsZT4KICAgIC50ZXh0IHsKICAgICAgZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmOwogICAgICBmb250LXdlaWdodDogYm9sZDsKICAgICAgZm9udC1zaXplOiAyNHB4OwogICAgICBmaWxsOiAjMTk3NmQyOwogICAgfQogICAgLmljZSB7CiAgICAgIGZpbGw6ICM5MGNhZjk7CiAgICB9CiAgICAucGxhbnQgewogICAgICBmaWxsOiAjNGNhZjUwOwogICAgfQogIDwvc3R5bGU+CiAgPHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSI4MCIgZmlsbD0id2hpdGUiIHJ4PSIxMCIgcnk9IjEwIiAvPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMwLCA1MCkiPgogICAgPCEtLSBJY2UgY3ViZXMgLS0+CiAgICA8cmVjdCB4PSIwIiB5PSItMzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgY2xhc3M9ImljZSIgcng9IjIiIHJ5PSIyIiAvPgogICAgPHJlY3QgeD0iMjUiIHk9Ii0zMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBjbGFzcz0iaWNlIiByeD0iMiIgcnk9IjIiIC8+CiAgICA8cmVjdCB4PSIxMyIgeT0iLTEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGNsYXNzPSJpY2UiIHJ4PSIyIiByeT0iMiIgLz4KICAgIDwhLS0gUGxhbnQgLS0+CiAgICA8cGF0aCBkPSJNNjAsMCBDNjAsLTIwIDgwLC0yMCA4MCwwIEw3MCwwIFoiIGNsYXNzPSJwbGFudCIgLz4KICAgIDxwYXRoIGQ9Ik05MCwwIEM5MCwtMjUgMTEwLC0yNSAxMTAsMCBMMTAwLDAgWiIgY2xhc3M9InBsYW50IiAvPgogICAgPHBhdGggZD0iTTc1LC01IEw5NSwtNSBMODUsLTM1IFoiIGNsYXNzPSJwbGFudCIgLz4KICAgIDxyZWN0IHg9IjgwIiB5PSIwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiM4ZDZlNjMiIC8+CiAgICA8IS0tIFRleHQgLS0+CiAgICA8dGV4dCB4PSIwIiB5PSIyMCIgY2xhc3M9InRleHQiPklDRSBQTEFOVDwvdGV4dD4KICA8L2c+Cjwvc3ZnPg==';

export default function Login() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { login: authLogin } = useAuth();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [companyInfo, setCompanyInfo] = useState({
    company_name: 'Ice Plant Management Portal',
    logo_url: null as string | null
  });
  const [logoLoading, setLogoLoading] = useState(true);

  // Fetch company info on component mount
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        setLogoLoading(true);
        // Use relative URL that will be proxied to the Django backend
        const response = await axios.get('/api/company/public-info/');
        if (response.data) {
          setCompanyInfo({
            company_name: response.data.company_name || 'Ice Plant Management Portal',
            logo_url: response.data.logo_url
          });
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
        // Keep default values on error
      } finally {
        setLogoLoading(false);
      }
    };

    fetchCompanyInfo();
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

    // Debug output to console
    console.log('[Login] Attempting login for user:', formData.username);
    console.log('[Login] Login endpoint:', '/api-token-auth/');

    try {
      // Direct fetch for debugging
      console.log('[Login] Creating JSON body');
      const body = JSON.stringify({
        username: formData.username,
        password: formData.password
      });
      
      console.log('[Login] Starting fetch request');
      // Use direct fetch to see exactly what's happening with the request
      const fetchResponse = await fetch('/api-token-auth/', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Accept':        'application/json',        // ← tell DRF you want JSON
          'X-Requested-With': 'XMLHttpRequest',       // ← disable Browsable API & toolbar
          // Add a custom header to help track this request in server logs
          'X-Debug-Login': 'true'
        },
        credentials: 'include', // Include cookies if needed
        body: body
      });
      
      console.log('[Login] Fetch status:', fetchResponse.status);
      console.log('[Login] Response headers:', Object.fromEntries([...fetchResponse.headers.entries()]));
      
      // Early check to see the raw response
      const responseText = await fetchResponse.text();
      console.log('[Login] Response body (raw):', responseText);
      
      let data;
      try {
        // Try to parse the JSON response
        data = JSON.parse(responseText);
        console.log('[Login] Parsed response data:', data);
      } catch (error) {
        console.error('[Login] Failed to parse JSON response:', error);
        throw new Error(`Failed to parse response: ${responseText.substring(0, 100)}...`);
      }
      
      // If we've reached here, we have valid JSON data
      if (data.token) {
        console.log('[Login] Successfully received token');
        // Fixed: Pass only username and token to match the AuthContext's login function signature
        await authLogin(formData.username, data.token);
        enqueueSnackbar('Login successful', { variant: 'success' });
        navigate('/', { replace: true });
      } else {
        console.error('[Login] No token in response data');
        throw new Error('Invalid response format: missing token');
      }
    } catch (error: any) {
      console.error('[Login] Error details:', error);
      
      // Extract useful error information
      let errorMessage = 'Login failed. Please check your username and password.';
      if (error.response) {
        // Axios error with response
        console.error('[Login] Response status:', error.response.status);
        console.error('[Login] Response headers:', error.response.headers);
        console.error('[Login] Response data:', error.response.data);
        
        if (error.response.status === 400) {
          errorMessage = 'Invalid username or password';
        } else if (error.response.status === 404) {
          errorMessage = 'Login endpoint not found (404). Please check server configuration.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        }
      } else if (error.message) {
        errorMessage = `Login error: ${error.message}`;
      }
      
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const logoUrl = companyInfo.logo_url || fallbackLogoDataUrl;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isSmallScreen ? 2 : 3,
        background: theme.palette.grey[100],
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <Container 
        maxWidth="xs" 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={6}
          sx={{
            padding: isSmallScreen ? 2 : 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          {/* Logo */}
          {logoLoading ? (
            <Box sx={{ width: '240px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
              <CircularProgress size={40} />
            </Box>
          ) : (
            <Box
              component="img"
              src={logoUrl}
              alt="Company Logo"
              sx={{
                maxWidth: '80%',
                height: 'auto',
                maxHeight: '120px',
                mb: 3,
                objectFit: 'contain',
              }}
              onError={(e) => {
                // If logo fails to load, use fallback
                const target = e.target as HTMLImageElement;
                if (target.src !== fallbackLogoDataUrl) {
                  target.src = fallbackLogoDataUrl;
                }
              }}
            />
          )}
          
          <Typography component="h2" variant="h6" color="textSecondary" gutterBottom>
            Sign In to {companyInfo.company_name}
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
          
          <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 2 }}>
            © {new Date().getFullYear()} {companyInfo.company_name}
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}