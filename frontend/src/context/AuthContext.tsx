// src/context/AuthContext.tsx
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/api';

// User interface
export interface User {
  id: number;
  email: string;
  username?: string;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signUp: (credentials: { email: string; password: string; username?: string }) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUserData();
    }
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      
      // Adjust based on your API response structure
      // If your API returns tokens directly in the response
      if (response.access) {
        localStorage.setItem('accessToken', response.access);
      }
      if (response.refresh) {
        localStorage.setItem('refreshToken', response.refresh);
      }
      
      // If your API returns user data in the response
      if (response.user) {
        setUser(response.user);
      } else {
        // If not, fetch user data separately
        await fetchUserData();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (credentials: { email: string; password: string; username?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.signUp(credentials);
      
      // Adjust based on your API response structure
      if (response.access) {
        localStorage.setItem('accessToken', response.access);
      }
      if (response.refresh) {
        localStorage.setItem('refreshToken', response.refresh);
      }
      
      if (response.user) {
        setUser(response.user);
      } else {
        await fetchUserData();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signUp, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;