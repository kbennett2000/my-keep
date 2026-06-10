import { createContext, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost, ApiError } from '../api.js';

// Holds the logged-in user and the auth actions. On mount it asks the server
// who we are (GET /api/auth/me) to restore a session across reloads.

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiGet('/api/auth/me')
      .then((u) => active && setUser(u))
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 401)) {
          // Unexpected (network/server) errors shouldn't wedge the app; just log.
          console.error('session check failed', err);
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function register(username, password) {
    setUser(await apiPost('/api/auth/register', { username, password }));
  }

  async function login(username, password) {
    setUser(await apiPost('/api/auth/login', { username, password }));
  }

  async function logout() {
    await apiPost('/api/auth/logout');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
