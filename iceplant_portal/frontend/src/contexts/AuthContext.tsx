import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginResponse } from '../types/api';
import { loggerService } from '../utils/logger';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: LoginResponse['user'] | null;
  login: (userData: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAdmin: false,
  user: null,
  login: () => { },
  logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<LoginResponse['user'] | null>(null);
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

  const login = (userData: LoginResponse) => {
    loggerService.info('User logged in', {
      username: userData.user.username,
      isAdmin: userData.user.is_staff || userData.user.is_superuser,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData.user));
    setIsAuthenticated(true);
    setUser(userData.user);
    
    // Set admin status based on Django's staff or superuser flag
    setIsAdmin(userData.user.is_staff === true || userData.user.is_superuser === true);
  };

  const logout = () => {
    const currentUser = user?.username;
    loggerService.info('User logged out', {
      username: currentUser,
      timestamp: new Date().toISOString()
    });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setIsAdmin(false); // Reset admin status
    setUser(null);
    navigate('/login', { replace: true });
  };

  const value = {
    isAuthenticated,
    isAdmin,
    user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 