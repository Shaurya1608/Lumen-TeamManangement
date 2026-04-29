import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

import { API_URL } from '../config';

const API = API_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // wait for refresh before rendering

  useEffect(() => {
    const savedToken = localStorage.getItem('team_task_token');
    if (!savedToken) { setLoading(false); return; }

    // Refresh user from server to always get latest role
    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${savedToken}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem('team_task_user', JSON.stringify(data.user));
          localStorage.setItem('team_task_token', data.token);
        } else {
          // Token invalid/expired — clear
          localStorage.removeItem('team_task_user');
          localStorage.removeItem('team_task_token');
        }
      })
      .catch(() => {
        // Backend unreachable — fall back to cached user
        const savedUser = localStorage.getItem('team_task_user');
        if (savedUser) { setUser(JSON.parse(savedUser)); setToken(savedToken); }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('team_task_user', JSON.stringify(userData));
    localStorage.setItem('team_task_token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('team_task_user');
    localStorage.removeItem('team_task_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
