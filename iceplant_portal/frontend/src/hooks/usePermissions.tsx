import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { loggerService } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';

// Define interfaces
interface Role {
  id: number;
  name: string;
  permissions: string[];
}

interface UserRole {
  id: number;
  user: number;
  role: number;
  role_name: string;
}

interface Permission {
  id: number;
  user: number;
  permission_type: string;
  permission_display: string;
}

export const usePermissions = () => {
  const { user, isAdmin } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        let rolesList: Role[] = [];
        let userRolesList: UserRole[] = [];
        let permissionsList: Permission[] = [];
        
        try {
          // Try to fetch all roles - this might fail for non-admin users
          const rolesResponse = await apiService.get('/api/users/roles/');
          rolesList = Array.isArray(rolesResponse) 
            ? rolesResponse 
            : (rolesResponse?.results || []);
          setRoles(rolesList);
          
          // Try to fetch user roles
          const userRolesResponse = await apiService.get('/api/users/user-roles/');
          userRolesList = Array.isArray(userRolesResponse) 
            ? userRolesResponse 
            : (userRolesResponse?.results || []);
          setUserRoles(userRolesList);
          
          // Try to fetch direct permissions
          const permissionsResponse = await apiService.get('/api/users/permissions/');
          permissionsList = Array.isArray(permissionsResponse) 
            ? permissionsResponse 
            : (permissionsResponse?.results || []);
          setPermissions(permissionsList);
        } catch (err) {
          // If we get 403 Forbidden, the user doesn't have admin access
          // We'll still continue but we'll rely on isAdmin status for permissions
          loggerService.warn('Cannot fetch roles or permissions. Falling back to basic permissions', err);
        }
        
        setLoading(false);
      } catch (error) {
        loggerService.error('Failed to fetch user permissions', error);
        setError('Failed to load permissions');
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, [user]);

  /**
   * Check if the user has a specific permission
   * @param permissionType The permission to check for, e.g. 'expenses_add'
   * @returns Boolean indicating whether the user has the permission
   */
  const hasPermission = (permissionType: string): boolean => {
    // If loading, assume they don't have permission yet
    if (loading) return false;
    
    // If user is admin, they have all permissions
    if (isAdmin) return true;
    
    // If we were able to fetch roles and permissions data, check those
    if (roles.length > 0 || permissions.length > 0) {
      // Check if user has this direct permission
      const hasDirectPermission = permissions.some(
        p => p.user === user?.id && p.permission_type === permissionType
      );
      
      if (hasDirectPermission) return true;
      
      // Check if user has a role that includes this permission
      const userRoleIds = userRoles
        .filter(ur => ur.user === user?.id)
        .map(ur => ur.role);
      
      const hasRoleWithPermission = roles
        .filter(role => userRoleIds.includes(role.id))
        .some(role => role.permissions.includes(permissionType));
      
      return hasRoleWithPermission;
    }
    
    // If we couldn't fetch roles/permissions data, fall back to basic checks
    // This section can be customized based on application requirements
    if (permissionType.startsWith('expenses_view')) {
      // Everyone can view expenses
      return true;
    }
    
    // For any other permission, default to false for non-admin users if we couldn't fetch roles
    return false;
  };

  return {
    loading,
    error,
    hasPermission,
    roles,
    userRoles,
    permissions
  };
}; 