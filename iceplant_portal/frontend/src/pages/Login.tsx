import React, { useState } from 'react';
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

// Logo as base64 data URL
const logoDataUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNDAgODAiIHdpZHRoPSIyNDAiIGhlaWdodD0iODAiPgogIDxzdHlsZT4KICAgIC50ZXh0IHsKICAgICAgZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmOwogICAgICBmb250LXdlaWdodDogYm9sZDsKICAgICAgZm9udC1zaXplOiAyNHB4OwogICAgICBmaWxsOiAjMTk3NmQyOwogICAgfQogICAgLmljZSB7CiAgICAgIGZpbGw6ICM5MGNhZjk7CiAgICB9CiAgICAucGxhbnQgewogICAgICBmaWxsOiAjNGNhZjUwOwogICAgfQogIDwvc3R5bGU+CiAgPHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSI4MCIgZmlsbD0id2hpdGUiIHJ4PSIxMCIgcnk9IjEwIiAvPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMwLCA1MCkiPgogICAgPCEtLSBJY2UgY3ViZXMgLS0+CiAgICA8cmVjdCB4PSIwIiB5PSItMzAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgY2xhc3M9ImljZSIgcng9IjIiIHJ5PSIyIiAvPgogICAgPHJlY3QgeD0iMjUiIHk9Ii0zMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBjbGFzcz0iaWNlIiByeD0iMiIgcnk9IjIiIC8+CiAgICA8cmVjdCB4PSIxMyIgeT0iLTEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGNsYXNzPSJpY2UiIHJ4PSIyIiByeT0iMiIgLz4KICAgIDwhLS0gUGxhbnQgLS0+CiAgICA8cGF0aCBkPSJNNjAsMCBDNjAsLTIwIDgwLC0yMCA4MCwwIEw3MCwwIFoiIGNsYXNzPSJwbGFudCIgLz4KICAgIDxwYXRoIGQ9Ik05MCwwIEM5MCwtMjUgMTEwLC0yNSAxMTAsMCBMMTAwLDAgWiIgY2xhc3M9InBsYW50IiAvPgogICAgPHBhdGggZD0iTTc1LC01IEw5NSwtNSBMODUsLTM1IFoiIGNsYXNzPSJwbGFudCIgLz4KICAgIDxyZWN0IHg9IjgwIiB5PSIwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiM4ZDZlNjMiIC8+CiAgICA8IS0tIFRleHQgLS0+CiAgICA8dGV4dCB4PSIwIiB5PSIyMCIgY2xhc3M9InRleHQiPklDRSBQTEFOVDwvdGV4dD4KICA8L2c+Cjwvc3ZnPg==';

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
      await authLogin(formData.username, formData.password);
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
          {/* Logo as Image */}
          <Box
            component="img"
            src={logoDataUrl}
            alt="Ice Plant Logo"
            sx={{
              width: '240px',
              height: 'auto',
              mb: 3,
            }}
          />
          
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
          
          <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 2 }}>
            © {new Date().getFullYear()} Ice Plant Management
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
} 