import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SharedCookbookView } from './SharedCookbookView';
import * as ClientContext from '../client/ClientContext';
import type { IClient } from '../client/types';

vi.mock('../client/ClientContext', () => ({
  useClient: vi.fn(),
}));

describe('SharedCookbookView', () => {
  const mockGetShared = vi.fn();
  const mockSaveRecipe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');

    mockGetShared.mockResolvedValue({
      data: {
        cookbook: {
          id: 'cookbook-1',
          name: 'Shared Favorites',
          description: 'Recipes for friends',
          recipeCount: 0,
          createdAt: 1,
          updatedAt: 1,
          isOwner: false,
          ownerName: 'Dev User',
        },
        recipes: [],
      },
    });

    vi.mocked(ClientContext.useClient).mockReturnValue({
      auth: {} as IClient['auth'],
      recipes: {} as IClient['recipes'],
      cookbooks: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        addRecipe: vi.fn(),
        removeRecipe: vi.fn(),
        shareWithUser: vi.fn(),
        shareByEmail: vi.fn(),
        removeShare: vi.fn(),
        getShares: vi.fn(),
        createShareLink: vi.fn(),
        revokeShareLink: vi.fn(),
        getShared: mockGetShared,
      },
      notifications: {} as IClient['notifications'],
      invites: {} as IClient['invites'],
      ai: {} as IClient['ai'],
      billing: {} as IClient['billing'],
      discover: {
        saveRecipe: mockSaveRecipe,
      } as unknown as IClient['discover'],
      profile: {} as IClient['profile'],
    });
    mockSaveRecipe.mockResolvedValue({ data: { id: 'recipe-1' } });
  });

  it('loads a shared cookbook through the configured client', async () => {
    render(<SharedCookbookView token="share-token" />);

    await waitFor(() => {
      expect(mockGetShared).toHaveBeenCalledWith('share-token');
    });

    expect(screen.getByRole('heading', { name: 'Shared Favorites' })).toBeDefined();
    expect(screen.getByText('Shared by Dev User')).toBeDefined();
  });

  it('links the shared cookbook header icon to the home page', async () => {
    render(<SharedCookbookView token="share-token" />);

    await screen.findByRole('heading', { name: 'Shared Favorites' });
    expect(screen.getByRole('link', { name: /recipesaurus home/i }).getAttribute('href')).toBe('/');
  });

  it('saves a public recipe from the shared cookbook detail modal', async () => {
    mockGetShared.mockResolvedValueOnce({
      data: {
        cookbook: {
          id: 'cookbook-1',
          name: 'Shared Favorites',
          description: 'Recipes for friends',
          recipeCount: 1,
          createdAt: 1,
          updatedAt: 1,
          isOwner: false,
          ownerName: 'Dev User',
        },
        recipes: [{
          id: 'recipe-1',
          title: 'Shared Noodles',
          description: 'A public shared recipe',
          ingredients: ['noodles'],
          instructions: ['Cook noodles'],
          tags: ['dinner'],
          isPublic: true,
          isOwner: false,
          isSaved: false,
          createdAt: 1,
        }],
      },
    });

    render(
      <MemoryRouter>
        <SharedCookbookView token="share-token" />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByText('Shared Noodles'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));

    await waitFor(() => {
      expect(mockSaveRecipe).toHaveBeenCalledWith('recipe-1');
    });
    expect(screen.getByRole('button', { name: 'Saved to My Recipes' })).toBeDefined();
  });
});
