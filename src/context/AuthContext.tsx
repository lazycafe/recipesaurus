import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useClient } from '../client/ClientContext';
import { setStoredToken, clearStoredToken } from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

interface AuthResult {
  success: boolean;
  error?: string;
  requiresVerification?: boolean;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, name: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; avatarUrl?: string | null }) => Promise<AuthResult>;
  verifyEmail: (token: string) => Promise<AuthResult>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
  devLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const useDevClient = import.meta.env.DEV && import.meta.env.VITE_USE_DEV_CLIENT === 'true';

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    // Keep the legacy dev-token shortcut for API-backed local dev only.
    if (import.meta.env.DEV && !useDevClient) {
      const storedToken = localStorage.getItem('recipesaurus_token');
      if (storedToken === 'dev-token') {
        setUser({
          id: 'dev-user-id',
          email: 'dev@example.com',
          name: 'Dev User',
          avatarUrl: null,
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      const { data } = await client.auth.getSession();
      if (data?.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await client.auth.login(email, password);

    if (error) {
      return { success: false, error };
    }

    if (data?.requiresVerification) {
      return { success: false, requiresVerification: true, email: data.email };
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
  ): Promise<AuthResult> => {
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

    const { data, error } = await client.auth.register(email, name, password);

    if (error) {
      return { success: false, error };
    }

    if (data?.requiresVerification) {
      return { success: false, requiresVerification: true, email: data.email };
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

  const verifyEmail = async (token: string): Promise<AuthResult> => {
    const { data, error } = await client.auth.verifyEmail(token);

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

    return { success: false, error: 'Verification failed' };
  };

  const updateProfile = async (data: { name?: string; avatarUrl?: string | null }): Promise<AuthResult> => {
    const { data: result, error } = await client.auth.updateProfile(data);

    if (error) {
      return { success: false, error };
    }

    if (result?.user) {
      setUser(result.user);
      return { success: true };
    }

    return { success: false, error: 'Profile update failed' };
  };

  const resendVerification = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await client.auth.resendVerification(email);

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  };

  const logout = async () => {
    await client.auth.logout();
    clearStoredToken();
    setUser(null);
  };

  const devLogin = async () => {
    if (!import.meta.env.DEV) {
      return;
    }

    if (useDevClient) {
      const { data, error } = await client.auth.login('dev@example.com', 'DevPassword123');
      if (error || !data?.user) {
        console.error('Dev login failed:', error ?? 'No user returned');
        return;
      }
      if (data.token) {
        setStoredToken(data.token);
      }
      setUser(data.user);
      return;
    }

    const devUser: User = {
      id: 'dev-user-id',
      email: 'dev@example.com',
      name: 'Dev User',
      avatarUrl: null,
    };
    setStoredToken('dev-token');
    setUser(devUser);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile, verifyEmail, resendVerification, devLogin }}>
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
