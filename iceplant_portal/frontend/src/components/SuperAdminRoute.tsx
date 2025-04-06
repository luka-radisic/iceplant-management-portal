import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from '@mui/material';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export default function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const isSuperuser = user?.isSuperuser === true;

  useEffect(() => {
    console.log('SuperAdmin Route - Auth Status:', { isAuthenticated, isSuperuser });
  }, [isAuthenticated, isSuperuser]);

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If authenticated but not superadmin, show access denied
  if (!isSuperuser) {
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
        <p>You do not have permission to access this page. Superadmin privileges are required.</p>
      </Alert>
    );
  }

  // If authenticated and superadmin, render children
  return <>{children}</>;
}