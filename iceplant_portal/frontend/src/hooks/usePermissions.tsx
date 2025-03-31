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
        
        // Use Promise.allSettled to handle both successful and failed requests
        const results = await Promise.allSettled([
          // Try to fetch user-specific permissions first - this should work for all users
          apiService.get('/api/users/permissions/'),
          
          // Try to fetch user roles - this might fail for non-admin users
          apiService.get('/api/users/user-roles/'),
          
          // Try to fetch all roles - this might fail for non-admin users
          apiService.get('/api/users/roles/')
        ]);
        
        // Handle permissions result
        if (results[0].status === 'fulfilled') {
          const permissionsResponse = results[0].value;
          permissionsList = Array.isArray(permissionsResponse) 
            ? permissionsResponse 
            : (permissionsResponse?.results || []);
          setPermissions(permissionsList);
          loggerService.info(`Loaded ${permissionsList.length} direct permissions for user`, { 
            userId: user.id, 
            permissions: permissionsList.map(p => p.permission_type) 
          });
        } else {
          loggerService.warn('Could not fetch user permissions', results[0].reason);
        }
        
        // Handle user roles result
        if (results[1].status === 'fulfilled') {
          const userRolesResponse = results[1].value;
          userRolesList = Array.isArray(userRolesResponse) 
            ? userRolesResponse 
            : (userRolesResponse?.results || []);
          setUserRoles(userRolesList);
          
          const userSpecificRoles = userRolesList.filter(ur => ur.user === user.id);
          loggerService.info(`Loaded ${userSpecificRoles.length} roles for user`, { 
            userId: user.id, 
            roles: userSpecificRoles.map(r => r.role_name || r.role) 
          });
        } else {
          loggerService.warn('Could not fetch user roles', results[1].reason);
        }
        
        // Handle roles result
        if (results[2].status === 'fulfilled') {
          const rolesResponse = results[2].value;
          rolesList = Array.isArray(rolesResponse) 
            ? rolesResponse 
            : (rolesResponse?.results || []);
          setRoles(rolesList);
          loggerService.info(`Loaded ${rolesList.length} role definitions`);
        } else {
          loggerService.warn('Could not fetch roles', results[2].reason);
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
    if (loading) {
      loggerService.debug(`Permission check while loading: ${permissionType} = false`);
      return false;
    }
    
    // If user is admin, they have all permissions
    if (isAdmin) {
      loggerService.debug(`Admin permission check: ${permissionType} = true`);
      return true;
    }
    
    // First, check if user has this direct permission
    const hasDirectPermission = permissions.some(
      p => p.user === user?.id && p.permission_type === permissionType
    );
    
    if (hasDirectPermission) {
      loggerService.debug(`Direct permission check: ${permissionType} = true`);
      return true;
    }
    
    // If we have role data, check role-based permissions
    if (roles.length > 0 && userRoles.length > 0) {
      // Get user role IDs
      const userRoleIds = userRoles
        .filter(ur => ur.user === user?.id)
        .map(ur => ur.role);
      
      // Check if any of the user's roles have this permission
      const hasRoleWithPermission = roles
        .filter(role => userRoleIds.includes(role.id))
        .some(role => role.permissions.includes(permissionType));
      
      if (hasRoleWithPermission) {
        loggerService.debug(`Role-based permission check: ${permissionType} = true`);
        return true;
      }
    }
    
    // Check for Manager role specifically, as we want to ensure managers have appropriate permissions
    // even if we couldn't fetch all role data
    const isManager = userRoles.some(
      ur => ur.role_name?.toLowerCase() === 'manager' && ur.user === user?.id
    );
    
    if (isManager) {
      // Define permissions that managers should have
      const managerViewPermissions = [
        'expenses_view', 'inventory_view', 'sales_view', 
        'buyers_view', 'attendance_view', 'reports_view'
      ];
      
      const managerEditPermissions = [
        'expenses_add', 'expenses_edit', 
        'inventory_add', 'inventory_edit',
        'sales_add', 'sales_edit',
        'buyers_add', 'buyers_edit',
        'attendance_add', 'attendance_edit'
      ];
      
      if (managerViewPermissions.includes(permissionType) || 
          managerEditPermissions.includes(permissionType)) {
        loggerService.debug(`Manager permission check: ${permissionType} = true`);
        return true;
      }
    }
    
    // Log detailed information about the failed permission check
    loggerService.debug(`Permission denied: ${permissionType}`, {
      userId: user?.id,
      userRoles: userRoles.filter(ur => ur.user === user?.id).map(r => r.role_name || r.role),
      directPermissionsCount: permissions.filter(p => p.user === user?.id).length,
      isManager
    });
    
    // Default to false - user must have explicit permission
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