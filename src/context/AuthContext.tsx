import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, setStoredToken, clearStoredToken } from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const { data } = await authApi.getSession();
      if (data?.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await authApi.login(email, password);

    if (error) {
      return { success: false, error };
    }

    if (data?.user) {
      if (data.token) {
        setStoredToken(data.token);
      }
      setUser(data.user);
      return { success: true };
    }

    return { success: false, error: 'Login failed' };
  };

  const register = async (
    email: string,
    name: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Validate password requirements
    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
      return { success: false, error: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { success: false, error: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { success: false, error: 'Password must contain at least one number' };
    }

    const { data, error } = await authApi.register(email, name, password);

    if (error) {
      return { success: false, error };
    }

    if (data?.user) {
      if (data.token) {
        setStoredToken(data.token);
      }
      setUser(data.user);
      return { success: true };
    }

    return { success: false, error: 'Registration failed' };
  };

  const logout = async () => {
    await authApi.logout();
    clearStoredToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
