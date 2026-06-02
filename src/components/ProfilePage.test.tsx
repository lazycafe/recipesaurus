import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ClientProvider } from '../client/ClientContext';
import type { Cookbook, IClient, ProfileUser, Recipe, UserProfile } from '../client/types';
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

  it('uploads profile pictures instead of editing an avatar URL', async () => {
    let savedAvatarUrl: string | null = null;
    const updateProfile = vi.fn(async (data: { name?: string; avatarUrl?: string | null }) => {
      savedAvatarUrl = data.avatarUrl || null;
      return { success: true };
    });

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: currentUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile,
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      devLogin: vi.fn(),
    });

    const getProfile = vi.fn(async () => ({
      data: {
        profile: {
          user: {
            id: currentUser.id,
            name: currentUser.name,
            avatarUrl: savedAvatarUrl,
          },
          isCurrentUser: true,
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

    const client = {
      profile: {
        get: getProfile,
        listFriends: vi.fn(),
        addFriend: vi.fn(),
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
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.queryByText('Profile picture URL')).toBeNull();
    expect(screen.queryByPlaceholderText('https://...')).toBeNull();

    const file = new File(['avatar-bytes'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Upload profile picture'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      const previews = screen.getAllByRole('img', { name: 'Alice Chef' }) as HTMLImageElement[];
      expect(previews.some(preview => /^data:image\/png;base64,/.test(preview.src))).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        name: 'Alice Chef',
        avatarUrl: expect.stringMatching(/^data:image\/png;base64,/),
      });
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

  it('labels profile content sections as public', async () => {
    const recipe: Recipe = {
      id: 'recipe-1',
      title: 'Public Pasta',
      description: 'A public recipe',
      ingredients: ['noodles'],
      instructions: ['boil'],
      tags: ['dinner'],
      isPublic: true,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      isOwner: true,
      createdAt: Date.now(),
    };
    const cookbook: Cookbook = {
      id: 'cookbook-1',
      name: 'Public Favorites',
      description: null,
      coverImage: null,
      recipeCount: 1,
      isSystem: false,
      systemType: null,
      isPublic: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isOwner: true,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
    };

    const client = {
      profile: {
        get: vi.fn(async () => ({
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
              friendCount: 0,
              recipeCount: 1,
              cookbookCount: 1,
              recipes: [recipe],
              cookbooks: [cookbook],
            } satisfies UserProfile,
          },
        })),
        listFriends: vi.fn(),
        addFriend: vi.fn(),
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

    expect(await screen.findByText('Public Recipes')).toBeDefined();
    expect(screen.getByText('Public Cookbooks')).toBeDefined();
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

  it('hides add friend by email form inside another profile friends modal', async () => {
    const bob: ProfileUser = { id: 'user-2', name: 'Bob Baker', avatarUrl: null };
    const carol: ProfileUser = { id: 'user-3', name: 'Carol Cook', avatarUrl: null };

    const getProfile = vi.fn(async () => ({
      data: {
        profile: {
          user: bob,
          isCurrentUser: false,
          isFriend: false,
          hasPendingFriendRequest: false,
          incomingFriendRequestId: null,
          friendCount: 1,
          recipeCount: 0,
          cookbookCount: 0,
          recipes: [],
          cookbooks: [],
        } satisfies UserProfile,
      },
    }));

    const client = {
      profile: {
        get: getProfile,
        listFriends: vi.fn(async () => ({ data: { friends: [carol] } })),
        addFriend: vi.fn(),
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
    fireEvent.click(screen.getByRole('button', { name: '1 Friends' }));

    await screen.findByText('Carol Cook');
    expect(screen.queryByLabelText('Friend email')).toBeNull();
    expect(screen.getByText('Carol Cook')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Remove Carol Cook' })).toBeNull();
  });

  it('lets the current user remove their friendship from another profile friends modal', async () => {
    const bob: ProfileUser = { id: 'user-2', name: 'Bob Baker', avatarUrl: null };
    const removeFriend = vi.fn(async () => ({ data: { success: true } }));

    const getProfile = vi.fn(async () => ({
      data: {
        profile: {
          user: bob,
          isCurrentUser: false,
          isFriend: true,
          hasPendingFriendRequest: false,
          incomingFriendRequestId: null,
          friendCount: 1,
          recipeCount: 0,
          cookbookCount: 0,
          recipes: [],
          cookbooks: [],
        } satisfies UserProfile,
      },
    }));

    const client = {
      profile: {
        get: getProfile,
        listFriends: vi.fn(async () => ({ data: { friends: [{ id: currentUser.id, name: currentUser.name, avatarUrl: null }] } })),
        addFriend: vi.fn(),
        removeFriend,
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
    fireEvent.click(screen.getByRole('button', { name: '1 Friends' }));

    const removeButton = await screen.findByRole('button', { name: 'Remove Bob Baker' });
    fireEvent.click(removeButton);

    await waitFor(() => expect(removeFriend).toHaveBeenCalledWith('user-2'));
    expect(screen.queryByRole('button', { name: 'Remove Bob Baker' })).toBeNull();
    expect(screen.getByText('No friends yet')).toBeDefined();
    expect(screen.getByRole('button', { name: '0 Friends' })).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('Bob Baker removed from friends');
  });

  it('removes friends from the current user friends modal', async () => {
    const bob: ProfileUser = { id: 'user-2', name: 'Bob Baker', avatarUrl: null };
    const removeFriend = vi.fn(async () => ({ data: { success: true } }));

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
          friendCount: 1,
          recipeCount: 0,
          cookbookCount: 0,
          recipes: [],
          cookbooks: [],
        } satisfies UserProfile,
      },
    }));

    const client = {
      profile: {
        get: getProfile,
        listFriends: vi.fn(async () => ({ data: { friends: [bob] } })),
        addFriend: vi.fn(),
        removeFriend,
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
    fireEvent.click(screen.getByRole('button', { name: '1 Friends' }));

    const removeButton = await screen.findByRole('button', { name: 'Remove Bob Baker' });
    fireEvent.click(removeButton);

    await waitFor(() => expect(removeFriend).toHaveBeenCalledWith('user-2'));
    expect(screen.queryByRole('button', { name: 'Remove Bob Baker' })).toBeNull();
    expect(screen.getByText('No friends yet')).toBeDefined();
    expect(screen.getByRole('button', { name: '0 Friends' })).toBeDefined();
    expect(screen.getByRole('status').textContent).toContain('Bob Baker removed from friends');
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
