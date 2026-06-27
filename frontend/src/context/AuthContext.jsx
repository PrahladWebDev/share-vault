import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const saveUser = useCallback((userData, token) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    if (token) localStorage.setItem('accessToken', token);
  }, []);

  const clearUser = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
  }, []);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await authAPI.getMe();
        saveUser(res.data.data.user, token);
      } catch {
        clearUser();
      } finally {
        setIsLoading(false);
      }
    };
    verifyAuth();
  }, [saveUser, clearUser]);

  useEffect(() => {
    const handleForceLogout = () => {
      clearUser();
      setIsLoading(false); // ← FIXED: was missing, caused stuck loading
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, [clearUser]);

  // Safety net: never stuck longer than 5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 5000);
    return () => clearTimeout(timeout);
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { user: userData, accessToken } = res.data.data;
    saveUser(userData, accessToken);
    return userData;
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    const { user: userData, accessToken } = res.data.data;
    saveUser(userData, accessToken);
    return userData;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {}
    clearUser();
  };

  const updateUser = (updatedUser) => {
    saveUser(updatedUser, localStorage.getItem('accessToken'));
  };

  const isAdmin = user?.role === 'admin';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider!');
  return context;
};
