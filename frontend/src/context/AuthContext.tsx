import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import { serverManager } from '../services/serverManager';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // Load user từ token khi app start
  useEffect(() => {
    const loadUser = async () => {
      if (!token) return;
      try {
        const data = await serverManager.makeRequest<{user: User}>('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(data.user);
      } catch (err) {
        console.warn('Token invalid or expired');
      }
    };
    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const data = await serverManager.makeRequest<{user: User, token: string}>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      return true;
    } catch {
      return false;
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const data = await serverManager.makeRequest<{user: User, token: string}>('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
