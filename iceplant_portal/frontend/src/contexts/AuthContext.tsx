import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LoginResponse } from '../types/api';
import { loggerService } from '../utils/logger';
import apiService from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAdmin: false,
  user: null,
  loading: true,
  login: async () => { },
  logout: () => { },
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUser(userData);
        
        // Corrected: Check only if user is a superuser for isAdmin flag
        setIsAdmin(userData.is_superuser === true);
        
        loggerService.info('User session restored', { 
          username: userData.username,
          // Corrected: Log only superuser status for isAdmin
          isAdmin: userData.is_superuser 
        });
      } catch (error) {
        loggerService.error('Error restoring user session', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false); // Ensure loading is set to false after check
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true); // Set loading at the start of login
    setError(null);   // Clear previous errors
    try {
      const response = await apiService.login(username, password);
      loggerService.info('User logged in', {
        username: response.user.username,
        // Corrected: Log only superuser status for isAdmin
        isAdmin: response.user.is_superuser,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setIsAuthenticated(true);
      setUser(response.user);
      
      // Corrected: Set admin status based ONLY on Django's is_superuser flag
      setIsAdmin(response.user.is_superuser === true);

      // Navigate based on role after successful login
      if (response.user.is_superuser) {
          navigate('/'); // Superuser goes to dashboard
      } else if (response.user.group === 'HR') {
          navigate('/attendance'); // HR goes to attendance
      } else {
          navigate('/'); // Default to dashboard for others (e.g., Office)
      }

    } catch (error: any) {
      loggerService.error('Error logging in', error);
      let errorMessage = 'Login failed. Please check your username and password.';
      if (error.response && error.response.data && error.response.data.non_field_errors) {
          errorMessage = error.response.data.non_field_errors[0];
      }
      setError(errorMessage);
      // Ensure state reflects failed login attempt
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
        setLoading(false); // Ensure loading is set to false after attempt
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUser(null);
    navigate('/login');
  };

  const value = {
    isAuthenticated,
    isAdmin,
    user,
    loading,
    login,
    logout,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 