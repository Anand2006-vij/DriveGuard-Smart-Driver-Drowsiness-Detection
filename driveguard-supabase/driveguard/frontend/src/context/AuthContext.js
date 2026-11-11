import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    getMe()
      .then(res => setAdmin(res.data.admin))
      .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('admin'); })
      .finally(() => setLoading(false));
  }, []);

  const loginUser = (token, adminData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('admin', JSON.stringify(adminData));
    setAdmin(adminData);
  };

  const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    setAdmin(null);
  };

  const updateAdmin = (data) => {
    const updated = { ...admin, ...data };
    localStorage.setItem('admin', JSON.stringify(updated));
    setAdmin(updated);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, loginUser, logoutUser, updateAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
