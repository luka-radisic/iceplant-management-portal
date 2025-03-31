import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { loggerService } from '../utils/logger';

interface Role {
  id: number;
  name: string;
  role_type: string;
  description: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  id: number;
  user: number;
  role: number;
  role_name: string;
  assigned_at: string;
  assigned_by: number | null;
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
        
        // Fetch all roles
        const rolesResponse = await apiService.get('/api/users/roles/');
        const rolesList = Array.isArray(rolesResponse) 
          ? rolesResponse 
          : (rolesResponse?.results || []);
        setRoles(rolesList);
        
        // Fetch user roles
        const userRolesResponse = await apiService.get('/api/users/user-roles/');
        const userRolesList = Array.isArray(userRolesResponse) 
          ? userRolesResponse 
          : (userRolesResponse?.results || []);
        setUserRoles(userRolesList);
        
        // Fetch direct permissions
        const permissionsResponse = await apiService.get('/api/users/permissions/');
        const permissionsList = Array.isArray(permissionsResponse) 
          ? permissionsResponse 
          : (permissionsResponse?.results || []);
        setPermissions(permissionsList);
        
        setLoading(false);
      } catch (error) {
        loggerService.error('Failed to fetch user permissions', error);
        setError('Failed to load permissions');
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, [user]);

  // Check if user has a specific permission
  const hasPermission = (permissionType: string): boolean => {
    if (!user) return false;
    
    // Admins (is_staff or is_superuser) have all permissions
    if (isAdmin) return true;
    
    // Check direct permissions
    const directPermissions = permissions
      .filter(perm => perm.user === user.id)
      .map(perm => perm.permission_type);
    
    if (directPermissions.includes(permissionType)) return true;
    
    // Check role-based permissions
    const userRolesList = userRoles.filter(ur => ur.user === user.id);
    const userRoleIds = userRolesList.map(ur => ur.role);
    
    // Get permissions from roles
    const rolePermissions = roles
      .filter(role => userRoleIds.includes(role.id) && role.is_active)
      .flatMap(role => role.permissions);
    
    return rolePermissions.includes(permissionType);
  };

  return {
    hasPermission,
    loading,
    error
  };
}; 