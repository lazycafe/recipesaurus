import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareRecipeModal } from './ShareRecipeModal';
import type { Recipe } from '../types/Recipe';
import { ClientProvider } from '../client/ClientContext';
import type { IClient } from '../client/types';
import * as AuthContext from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('ShareRecipeModal', () => {
  const mockWriteText = vi.fn();
  const mockCreateShareLink = vi.fn();
  const mockShareWithUser = vi.fn();
  const mockListFriends = vi.fn();
  const currentUser = {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice Chef',
    avatarUrl: null,
  };
  const recipe: Recipe = {
    id: 'recipe-1',
    title: 'Herb Chicken',
    description: 'A bright weeknight dinner',
    ingredients: ['chicken', 'herbs'],
    instructions: ['Season chicken', 'Bake until done'],
    tags: ['dinner'],
    prepTime: '10 mins',
    cookTime: '25 mins',
    servings: '4',
    sourceUrl: 'https://example.com/recipe',
    createdAt: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
    mockCreateShareLink.mockResolvedValue({
      data: { token: 'short-share-token', createdAt: 1 },
    });
    mockShareWithUser.mockResolvedValue({
      data: {
        success: true,
        sharedWith: { id: 'friend-1', name: 'Bob Baker', avatarUrl: null },
        shareLink: { token: 'friend-share-token', createdAt: 1 },
      },
    });
    mockListFriends.mockResolvedValue({
      data: {
        friends: [{ id: 'friend-1', name: 'Bob Baker', avatarUrl: null }],
      },
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
    });

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
  });

  const client = {
    recipes: {
      createShareLink: mockCreateShareLink,
      shareWithUser: mockShareWithUser,
    },
    profile: {
      listFriends: mockListFriends,
    },
  } as unknown as IClient;

  it('shares a recipe with a selected platform friend', async () => {
    render(
      <ClientProvider client={client}>
        <ShareRecipeModal recipe={recipe} onClose={vi.fn()} />
      </ClientProvider>
    );

    expect(await screen.findByText('Bob Baker')).toBeDefined();
    expect(screen.queryByText('Share by Email')).toBeNull();
    expect(screen.queryByPlaceholderText('Enter email address')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => {
      expect(mockShareWithUser).toHaveBeenCalledWith({
        title: 'Herb Chicken',
        description: 'A bright weeknight dinner',
        ingredients: ['chicken', 'herbs'],
        instructions: ['Season chicken', 'Bake until done'],
        prepTime: '10 mins',
        cookTime: '25 mins',
        servings: '4',
        imageUrl: undefined,
        sourceUrl: 'https://example.com/recipe',
      }, 'friend-1');
    });
    expect(screen.getByText('Shared with Bob Baker')).toBeDefined();
  });

  it('copies a short public URL for shared recipes', async () => {
    render(
      <ClientProvider client={client}>
        <ShareRecipeModal recipe={recipe} onClose={vi.fn()} />
      </ClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share Link' }));
    fireEvent.click(screen.getByTitle('Copy link'));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledOnce();
    });

    const copiedUrl = mockWriteText.mock.calls[0][0] as string;
    expect(mockCreateShareLink).toHaveBeenCalledWith({
      title: 'Herb Chicken',
      description: 'A bright weeknight dinner',
      ingredients: ['chicken', 'herbs'],
      instructions: ['Season chicken', 'Bake until done'],
      prepTime: '10 mins',
      cookTime: '25 mins',
      servings: '4',
      imageUrl: undefined,
      sourceUrl: 'https://example.com/recipe',
    });
    expect(copiedUrl).toContain('/shared-recipe/short-share-token');
    expect(copiedUrl).not.toContain('/preview/');
    expect(copiedUrl).not.toContain('/recipe/');
  });
});
