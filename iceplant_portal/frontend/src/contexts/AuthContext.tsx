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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed: User = JSON.parse(stored);
        // normalize legacy is_superuser if present
        if ((parsed as any).is_superuser !== undefined && parsed.isSuperuser === undefined) {
          parsed.isSuperuser = (parsed as any).is_superuser === true;
        }
        // coerce to boolean
        parsed.isSuperuser = Boolean(parsed.isSuperuser);
        parsed.isAdmin      = Boolean(parsed.isAdmin);
        setUser(parsed);
      } catch {
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
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
