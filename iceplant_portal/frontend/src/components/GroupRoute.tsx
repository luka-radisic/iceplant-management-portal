import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert } from '@mui/material';

interface GroupRouteProps {
  children: React.ReactNode;
  allowedGroups: string[];
  redirectPath?: string;
  accessDeniedMessage?: string;
}

export default function GroupRoute({ 
  children, 
  allowedGroups, 
  redirectPath = "/login", 
  accessDeniedMessage = "You do not have permission to access this page."
}: GroupRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log('Group Route - Auth Status:', { 
      isAuthenticated, 
      userGroup: user?.group,
      allowedGroups 
    });
  }, [isAuthenticated, user, allowedGroups]);

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace state={{ from: location }} />;
  }

  // For superusers, always allow access
  if (user?.isSuperuser) {
    return <>{children}</>;
  }

  // If user's group is in the allowedGroups array, allow access
  const userGroup = user?.group || '';
  if (allowedGroups.includes(userGroup)) {
    return <>{children}</>;
  }

  // Otherwise, deny access
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
      <p>{accessDeniedMessage}</p>
      <p>Required groups: {allowedGroups.join(', ')}</p>
      <p>Your group: {userGroup || 'None'}</p>
    </Alert>
  );
}
