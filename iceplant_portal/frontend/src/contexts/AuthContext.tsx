// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  username: string;
  full_name: string;
  group: string | null;
  isAdmin: boolean;
  isSuperuser: boolean;
  token: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperuser: boolean;

  // Changed: login now takes a user object including token
  login: (userData: User) => void;
  logout: () => void;
  
  // Group-based permission helpers
  hasAccess: (module: string) => boolean;
  isInGroup: (groupName: string | string[]) => boolean; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    console.log('[AuthContext] Raw user data from localStorage:', stored); // Log raw data
    if (stored) {
      try {
        const parsed: User = JSON.parse(stored);
        console.log('[AuthContext] Parsed user data from localStorage:', parsed); // Log parsed data
        // normalize legacy is_superuser if present
        if ((parsed as any).is_superuser !== undefined && parsed.isSuperuser === undefined) {
          parsed.isSuperuser = (parsed as any).is_superuser === true;
        }
        // coerce to boolean
        parsed.isSuperuser = Boolean(parsed.isSuperuser);
        parsed.isAdmin      = Boolean(parsed.isAdmin);
        console.log('[AuthContext] Final user data after normalization:', parsed); // Log final data
        setUser(parsed);
      } catch {
        console.error('[AuthContext] Failed to parse user data from localStorage'); // Log parsing errors
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  // 🔥 NEW: no network call here, just store the token + user info
  // Updated: login now takes a user data object
  const login = (userData: User) => {
    // persist token
    localStorage.setItem('token', userData.token);

    // Store the full user data object
    console.log('[AuthContext] Storing user data in localStorage:', userData); // Log data being stored
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };
  // Helper function to check if user has access to a specific module
  const hasAccess = (module: string): boolean => {
    if (!user) return false;
    if (user.isSuperuser) return true; // Superuser has access to everything
    
    // Module-specific group access rules
    const moduleAccessMapping: Record<string, string[]> = {
      'attendance': ['HR', 'Managers', 'Admins'],
      'sales': ['Sales', 'Accounting', 'Managers', 'Admins'],
      'inventory': ['Inventory', 'Operations', 'Managers', 'Admins'],
      'expenses': ['Accounting', 'Finance', 'Managers', 'Admins'],
      'maintenance': ['Maintenance', 'Operations', 'Managers', 'Admins'],
      'buyers': ['Sales', 'Accounting', 'Managers', 'Admins'],
    };
    
    const allowedGroups = moduleAccessMapping[module] || [];
    return isInGroup(allowedGroups);
  };
  
  // Helper function to check if user belongs to one of the specified groups
  const isInGroup = (groupName: string | string[]): boolean => {
    if (!user || !user.group) return false;
    if (user.isSuperuser) return true; // Superuser is considered in all groups
    
    const groups = Array.isArray(groupName) ? groupName : [groupName];
    return groups.includes(user.group);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAdmin: user?.isAdmin ?? false,
        isSuperuser: user?.isSuperuser ?? false,
        login,
        logout,
        hasAccess,
        isInGroup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
