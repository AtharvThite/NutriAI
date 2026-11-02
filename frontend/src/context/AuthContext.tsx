import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials, SignupCredentials } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'nutriai_token';
const USER_KEY = 'nutriai_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    const verifySession = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await api.getMe();
        setUser(currentUser);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      } catch (err) {
        console.warn('Session verification failed, logging out:', err);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await api.login(credentials);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const signup = useCallback(async (credentials: SignupCredentials) => {
    const res = await api.signup(credentials);
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    // Fire-and-forget server logout notification
    api.logout().catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const updatedUser = await api.updateProfile(updates);
    setUser(updatedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
