import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ClientProvider } from '../client/ClientContext';
import type { IClient, ProfileUser, UserProfile } from '../client/types';
import { ProfilePage } from './ProfilePage';
import * as AuthContext from '../context/AuthContext';
import * as ToastContext from '../context/ToastContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: vi.fn(),
}));

describe('ProfilePage', () => {
  const currentUser = {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice Chef',
    avatarUrl: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: currentUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      devLogin: vi.fn(),
    });

    vi.mocked(ToastContext.useToast).mockReturnValue({
      showToast: vi.fn(),
      hideToast: vi.fn(),
    });
  });

  it('shows add friend by email success inline inside the friends modal', async () => {
    const bob: ProfileUser = { id: 'user-2', name: 'Bob Baker', avatarUrl: null };
    const friends: ProfileUser[] = [];
    const showToast = vi.fn();

    vi.mocked(ToastContext.useToast).mockReturnValue({
      showToast,
      hideToast: vi.fn(),
    });

    const getProfile = vi.fn(async () => ({
      data: {
        profile: {
          user: {
            id: currentUser.id,
            name: currentUser.name,
            avatarUrl: currentUser.avatarUrl,
          },
          isCurrentUser: true,
          isFriend: false,
          hasPendingFriendRequest: false,
          incomingFriendRequestId: null,
          friendCount: friends.length,
          recipeCount: 0,
          cookbookCount: 0,
          recipes: [],
          cookbooks: [],
        } satisfies UserProfile,
      },
    }));

    const listFriends = vi.fn(async () => ({ data: { friends: [...friends] } }));
    const addFriend = vi.fn(async () => ({ data: { friend: bob } }));

    const client = {
      profile: {
        get: getProfile,
        listFriends,
        addFriend,
        removeFriend: vi.fn(),
      },
    } as unknown as IClient;

    render(
      <ClientProvider client={client}>
        <MemoryRouter initialEntries={[`/profiles/${currentUser.id}`]}>
          <Routes>
            <Route path="/profiles/:userId" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </ClientProvider>
    );

    await screen.findByText('Alice Chef');
    expect(screen.queryByLabelText('Friend email')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '0 Friends' }));

    const friendEmail = await screen.findByLabelText('Friend email');
    fireEvent.change(friendEmail, { target: { value: 'bob@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Friend' }));

    await waitFor(() => expect(addFriend).toHaveBeenCalledWith({ email: 'bob@example.com' }));
    expect(listFriends).toHaveBeenCalledTimes(1);
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByText('No friends yet')).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('Friend request sent to Bob Baker');
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
    expect(showToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Friend request sent to Bob Baker', type: 'success' })
    );
  });

  it('shows add friend by email errors inline inside the friends modal', async () => {
    const friends: ProfileUser[] = [];
    const showToast = vi.fn();

    vi.mocked(ToastContext.useToast).mockReturnValue({
      showToast,
      hideToast: vi.fn(),
    });

    const getProfile = vi.fn(async () => ({
      data: {
        profile: {
          user: {
            id: currentUser.id,
            name: currentUser.name,
            avatarUrl: currentUser.avatarUrl,
          },
          isCurrentUser: true,
          isFriend: false,
          hasPendingFriendRequest: false,
          incomingFriendRequestId: null,
          friendCount: friends.length,
          recipeCount: 0,
          cookbookCount: 0,
          recipes: [],
          cookbooks: [],
        } satisfies UserProfile,
      },
    }));

    const listFriends = vi.fn(async () => ({ data: { friends: [...friends] } }));
    const addFriend = vi.fn(async () => ({ error: 'User not found' }));

    const client = {
      profile: {
        get: getProfile,
        listFriends,
        addFriend,
        removeFriend: vi.fn(),
      },
    } as unknown as IClient;

    render(
      <ClientProvider client={client}>
        <MemoryRouter initialEntries={[`/profiles/${currentUser.id}`]}>
          <Routes>
            <Route path="/profiles/:userId" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </ClientProvider>
    );

    await screen.findByText('Alice Chef');
    fireEvent.click(screen.getByRole('button', { name: '0 Friends' }));

    const friendEmail = await screen.findByLabelText('Friend email');
    fireEvent.change(friendEmail, { target: { value: 'missing@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Friend' }));

    await waitFor(() => expect(addFriend).toHaveBeenCalledWith({ email: 'missing@example.com' }));
    expect(screen.getByRole('alert').textContent).toContain('User not found');
    expect(screen.getByText('No friends yet')).toBeDefined();
    expect(showToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User not found', type: 'error' })
    );
  });

  it('marks profile add friend as pending without showing a success modal', async () => {
    const bob: ProfileUser = { id: 'user-2', name: 'Bob Baker', avatarUrl: null };
    const showToast = vi.fn();

    vi.mocked(ToastContext.useToast).mockReturnValue({
      showToast,
      hideToast: vi.fn(),
    });

    const getProfile = vi.fn(async () => ({
      data: {
        profile: {
          user: bob,
          isCurrentUser: false,
          isFriend: false,
          hasPendingFriendRequest: false,
          incomingFriendRequestId: null,
          friendCount: 0,
          recipeCount: 0,
          cookbookCount: 0,
          recipes: [],
          cookbooks: [],
        } satisfies UserProfile,
      },
    }));

    const addFriend = vi.fn(async () => ({ data: { friend: bob } }));

    const client = {
      profile: {
        get: getProfile,
        listFriends: vi.fn(),
        addFriend,
        removeFriend: vi.fn(),
      },
    } as unknown as IClient;

    render(
      <ClientProvider client={client}>
        <MemoryRouter initialEntries={['/profiles/user-2']}>
          <Routes>
            <Route path="/profiles/:userId" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </ClientProvider>
    );

    await screen.findByText('Bob Baker');
    fireEvent.click(screen.getByRole('button', { name: 'Add Friend' }));

    await waitFor(() => expect(addFriend).toHaveBeenCalledWith({ userId: 'user-2' }));
    expect((screen.getByRole('button', { name: 'Request Sent' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('Friend Request Sent')).toBeNull();
    expect(screen.queryByText('Friend request sent to Bob Baker')).toBeNull();
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Friend request sent to Bob Baker', type: 'success' })
    );
  });
});
