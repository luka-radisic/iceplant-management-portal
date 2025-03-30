import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from '@mui/material';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log('Admin Route - Auth Status:', { isAuthenticated, isAdmin });
  }, [isAuthenticated, isAdmin]);

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If authenticated but not admin, show access denied
  if (!isAdmin) {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          m: 4, 
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page. Admin privileges are required.</p>
      </Alert>
    );
  }

  // If authenticated and admin, render children
  return <>{children}</>;
} 