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
        
        // First try to get directly assigned user permissions
        try {
          const permissionsResponse = await apiService.get('/api/users/permissions/');
          permissionsList = Array.isArray(permissionsResponse) 
            ? permissionsResponse 
            : (permissionsResponse?.results || []);
          setPermissions(permissionsList);
          
          loggerService.info(`Loaded ${permissionsList.length} direct permissions for user`, { 
            userId: user.id, 
            permissions: permissionsList.map(p => p.permission_type) 
          });
        } catch (error) {
          loggerService.warn('Could not fetch user permissions', error);
        }
        
        // Then try to get user roles
        try {
          const userRolesResponse = await apiService.get('/api/users/user-roles/');
          userRolesList = Array.isArray(userRolesResponse) 
            ? userRolesResponse 
            : (userRolesResponse?.results || []);
          
          // Filter to just this user's roles
          const userSpecificRoles = userRolesList.filter(ur => ur.user === user.id);
          setUserRoles(userSpecificRoles);
          
          loggerService.info(`Loaded ${userSpecificRoles.length} roles for user`, { 
            userId: user.id, 
            username: user.username,
            roles: userSpecificRoles.map(r => ({ id: r.role, name: r.role_name }))
          });
          
          // Debug log all role names exactly as they appear
          if (userSpecificRoles.length > 0) {
            loggerService.debug('User role data:', { 
              exact_role_names: userSpecificRoles.map(r => r.role_name) 
            });
          }
        } catch (error) {
          loggerService.warn('Could not fetch user roles', error);
        }
        
        // Last, try to get all roles with their permissions
        try {
          const rolesResponse = await apiService.get('/api/users/roles/');
          rolesList = Array.isArray(rolesResponse) 
            ? rolesResponse 
            : (rolesResponse?.results || []);
          
          setRoles(rolesList);
          
          loggerService.info(`Loaded ${rolesList.length} role definitions`, {
            roles: rolesList.map(r => ({ id: r.id, name: r.name, permissions: r.permissions }))
          });
        } catch (error) {
          loggerService.warn('Could not fetch roles definitions', error);
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
    
    // If user is admin or superuser, they have all permissions
    if (isAdmin) {
      loggerService.debug(`Admin permission check: ${permissionType} = true`);
      return true;
    }
    
    // First, check if user has this direct permission
    const hasDirectPermission = permissions.some(
      p => p.user === user?.id && p.permission_type === permissionType
    );
    
    if (hasDirectPermission) {
      loggerService.debug(`Direct permission check: ${permissionType} = true (user ${user?.id} has direct permission)`);
      return true;
    }
    
    // Extract this user's role IDs
    const userRoleIds = userRoles
      .filter(ur => ur.user === user?.id)
      .map(ur => ur.role);
    
    loggerService.debug(`User ${user?.username} has roles:`, userRoleIds);
    
    // Now check if any of the user's roles have this permission
    for (const role of roles) {
      if (userRoleIds.includes(role.id) && role.permissions.includes(permissionType)) {
        loggerService.debug(`Role-based permission check: ${permissionType} = true (user has role ${role.name} with permission)`);
        return true;
      }
    }
    
    // Check for roles by name if we couldn't get the roles by ID
    // This is a fallback for when the roles API is not accessible
    const userRoleNames = userRoles
      .filter(ur => ur.user === user?.id)
      .map(ur => ur.role_name?.toLowerCase() || '');
    
    // If the user has a Manager role, give them basic management permissions
    if (userRoleNames.some(name => name.includes('manager'))) {
      loggerService.debug(`User has a manager role: ${userRoleNames.filter(n => n.includes('manager'))}`);
      
      // Common permissions for manager role
      const managerPermissions = [
        'expenses_view', 'expenses_add', 'expenses_edit',
        'inventory_view', 'inventory_add', 'inventory_edit',
        'sales_view', 'sales_add', 'sales_edit',
        'buyers_view', 'buyers_add', 'buyers_edit',
        'attendance_view', 'attendance_add', 'attendance_edit',
        'reports_view'
      ];
      
      if (managerPermissions.includes(permissionType)) {
        loggerService.debug(`Manager role permission match: ${permissionType} = true`);
        return true;
      }
    }
    
    // Log detailed information about the failed permission check
    loggerService.debug(`Permission denied: ${permissionType}`, {
      userId: user?.id,
      username: user?.username,
      directPermissionsCount: permissions.filter(p => p.user === user?.id).length,
      userRoleIds,
      userRoleNames
    });
    
    // Permission not found through any method
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