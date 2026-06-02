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

  it('keeps add friend by email inside the friends modal', async () => {
    const bob: ProfileUser = { id: 'user-2', name: 'Bob Baker', avatarUrl: null };
    const friends: ProfileUser[] = [];

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
    expect(listFriends).toHaveBeenCalledTimes(2);
    expect(screen.getByText('No friends yet')).toBeDefined();
  });

  it('only renders public recipes and cookbooks in profile carousels', async () => {
    const publicRecipe: Recipe = {
      id: 'recipe-public',
      title: 'Public Pasta',
      description: 'Shareable noodles',
      ingredients: ['pasta'],
      instructions: ['Boil water'],
      tags: [],
      isPublic: true,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      isOwner: true,
      createdAt: 1,
    };
    const privateRecipe: Recipe = {
      ...publicRecipe,
      id: 'recipe-private',
      title: 'Private Tart',
      isPublic: false,
      createdAt: 2,
    };
    const publicCookbook: Cookbook = {
      id: 'cookbook-public',
      ownerId: currentUser.id,
      name: 'Public Cookbook',
      description: null,
      coverImage: null,
      recipeCount: 1,
      isSystem: false,
      systemType: null,
      isPublic: true,
      createdAt: 1,
      updatedAt: 1,
      isOwner: true,
      ownerName: currentUser.name,
    };
    const privateCookbook: Cookbook = {
      ...publicCookbook,
      id: 'cookbook-private',
      name: 'Secret Cookbook',
      isPublic: false,
      updatedAt: 2,
    };

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
          friendCount: 0,
          recipeCount: 2,
          cookbookCount: 2,
          recipes: [privateRecipe, publicRecipe],
          cookbooks: [privateCookbook, publicCookbook],
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

    await screen.findByText('Public Pasta');

    expect(screen.queryByText('Private Tart')).toBeNull();
    expect(screen.getAllByText('Public Cookbook').length).toBeGreaterThan(0);
    expect(screen.queryByText('Secret Cookbook')).toBeNull();
  });
});
