import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ClientProvider } from '../client/ClientContext';
import type { IClient } from '../client/types';
import { AuthProvider, useAuth } from './AuthContext';

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

function createAuthClientMock(overrides?: Partial<IClient['auth']>): IClient {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { user: null } }),
      login: vi.fn().mockResolvedValue({ error: 'Invalid login' }),
      register: vi.fn().mockResolvedValue({ data: {
        user: { id: 'dev-user-id', email: 'dev@example.com', name: 'Dev User' },
        token: 'real-dev-token',
      } }),
      logout: vi.fn().mockResolvedValue({ data: { success: true } }),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      ...overrides,
    },
    recipes: {} as IClient['recipes'],
    cookbooks: {} as IClient['cookbooks'],
    notifications: {} as IClient['notifications'],
    invites: {} as IClient['invites'],
    ai: {} as IClient['ai'],
    billing: {} as IClient['billing'],
    discover: {} as IClient['discover'],
  };
}

function AuthProbe() {
  const { user, isLoading, devLogin } = useAuth();

  if (isLoading) {
    return <p>Loading</p>;
  }

  return (
    <div>
      <p>{user ? `Signed in as ${user.email}` : 'Signed out'}</p>
      <button onClick={() => void devLogin()}>Dev login</button>
    </div>
  );
}

function renderAuth(client: IClient) {
  return render(
    <ClientProvider client={client}>
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    </ClientProvider>
  );
}

describe('AuthProvider dev auth', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not trust stale fake dev tokens as a signed-in session', async () => {
    const client = createAuthClientMock();
    localStorage.setItem('recipesaurus_token', 'dev-token');

    renderAuth(client);

    await waitFor(() => {
      expect(screen.getByText('Signed out')).toBeDefined();
    });
    expect(localStorage.getItem('recipesaurus_token')).toBeNull();
    expect(client.auth.getSession).toHaveBeenCalled();
  });

  it('dev login signs in through the client and stores the real token', async () => {
    const client = createAuthClientMock();
    renderAuth(client);

    await waitFor(() => {
      expect(screen.getByText('Signed out')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Dev login'));

    await waitFor(() => {
      expect(screen.getByText('Signed in as dev@example.com')).toBeDefined();
    });
    expect(client.auth.login).toHaveBeenCalledWith('dev@example.com', 'DevPassword123');
    expect(client.auth.register).toHaveBeenCalledWith('dev@example.com', 'Dev User', 'DevPassword123');
    expect(localStorage.getItem('recipesaurus_token')).toBe('real-dev-token');
  });
});
