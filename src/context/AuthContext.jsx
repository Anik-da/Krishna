import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiLogin, apiLogout, apiGetMe, getToken } from '../api/apiClient';

const AuthContext = createContext();
const AUTH_STORAGE_KEY = 'krishna_kripa_admin_session';

const DEFAULT_ADMIN_USER = 'ANIK';
const DEFAULT_ADMIN_PASS = 'anik@45';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
        const token = getToken();

        if (token) {
          try {
            const meData = await apiGetMe();
            if (meData?.admin) {
              setCurrentUser({
                username: meData.admin.username,
                name: meData.admin.name || 'Anik (Administrator)',
                role: meData.admin.role || 'Super Admin'
              });
              setLoading(false);
              return;
            }
          } catch (e) {
            // Token may have expired or server offline
          }
        }

        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.username === DEFAULT_ADMIN_USER) {
            setCurrentUser(parsed);
          }
        }
      } catch (e) {
        console.error("Auth session read error", e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    if (!username || !username.trim()) {
      throw new Error('Please enter your administrator username.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    const cleanUser = username.trim();

    try {
      // 1. Authenticate with MongoDB Atlas backend
      const response = await apiLogin(cleanUser, password);
      const sessionData = {
        username: response.admin?.username || cleanUser,
        name: response.admin?.name || 'Anik (Administrator)',
        role: response.admin?.role || 'Super Admin',
        loginTime: new Date().toISOString()
      };
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
      setCurrentUser(sessionData);
      return sessionData;
    } catch (apiError) {
      // 2. Fallback check for initial admin credentials if backend offline
      if (cleanUser.toUpperCase() === DEFAULT_ADMIN_USER && password === DEFAULT_ADMIN_PASS) {
        const sessionData = {
          username: DEFAULT_ADMIN_USER,
          name: 'Anik (Administrator)',
          role: 'Super Admin',
          loginTime: new Date().toISOString()
        };
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
        setCurrentUser(sessionData);
        return sessionData;
      }
      throw new Error(apiError.message || 'Invalid administrator credentials. Please check your username and password.');
    }
  };

  const logout = async () => {
    await apiLogout();
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading, isAuthenticated: !!currentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
