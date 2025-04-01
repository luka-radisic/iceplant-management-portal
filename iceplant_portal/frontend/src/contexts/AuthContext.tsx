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
        
        // Check if user is an admin
        setIsAdmin(userData.is_staff === true || userData.is_superuser === true);
        
        loggerService.info('User session restored', { 
          username: userData.username,
          isAdmin: userData.is_staff || userData.is_superuser 
        });
      } catch (error) {
        loggerService.error('Error restoring user session', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiService.login(username, password);
      loggerService.info('User logged in', {
        username: response.user.username,
        isAdmin: response.user.is_staff || response.user.is_superuser,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setIsAuthenticated(true);
      setUser(response.user);
      
      // Set admin status based on Django's staff or superuser flag
      setIsAdmin(response.user.is_staff === true || response.user.is_superuser === true);
    } catch (error) {
      loggerService.error('Error logging in', error);
      setError('An error occurred while logging in. Please try again later.');
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