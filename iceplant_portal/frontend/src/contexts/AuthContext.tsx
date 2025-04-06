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
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Patch: ensure consistent property names 
        if (parsedUser.is_superuser !== undefined && parsedUser.isSuperuser === undefined) {
          parsedUser.isSuperuser = parsedUser.is_superuser;
        }
        // Ensure is_superuser is boolean
        parsedUser.isSuperuser = parsedUser.isSuperuser === true || parsedUser.isSuperuser === 'true';
        parsedUser.isAdmin = parsedUser.isAdmin === true || parsedUser.isAdmin === 'true';
        setUser(parsedUser);
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api-token-auth/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error('Invalid credentials');
      const data = await response.json();

      const token = data.token;
      const isAdmin = data.is_staff ?? false;
      // Use is_superuser from backend but store as isSuperuser for frontend consistency
      const isSuperuser = data.is_superuser ?? false;

      const userObj = {
        username,
        full_name: data.full_name ?? username,
        group: data.group ?? null,
        isAdmin,
        isSuperuser,
        token
      };
      localStorage.setItem('user', JSON.stringify(userObj));
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
      localStorage.setItem('isAdmin', String(isAdmin));
      localStorage.setItem('isSuperuser', String(isSuperuser));

      setUser({
        username,
        full_name: data.full_name ?? username,
        group: data.group ?? null,
        isAdmin,
        isSuperuser,
        token
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isSuperuser');
    setUser(null);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};