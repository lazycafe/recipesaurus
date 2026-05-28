import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SharedCookbookView } from './SharedCookbookView';
import * as ClientContext from '../client/ClientContext';
import type { IClient } from '../client/types';

vi.mock('../client/ClientContext', () => ({
  useClient: vi.fn(),
}));

describe('SharedCookbookView', () => {
  const mockGetShared = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

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
        shareByEmail: vi.fn(),
        removeShare: vi.fn(),
        getShares: vi.fn(),
        createShareLink: vi.fn(),
        revokeShareLink: vi.fn(),
        getShared: mockGetShared,
      },
      notifications: {} as IClient['notifications'],
      invites: {} as IClient['invites'],
      discover: {} as IClient['discover'],
    });
  });

  it('loads a shared cookbook through the configured client', async () => {
    render(<SharedCookbookView token="share-token" />);

    await waitFor(() => {
      expect(mockGetShared).toHaveBeenCalledWith('share-token');
    });

    expect(screen.getByRole('heading', { name: 'Shared Favorites' })).toBeDefined();
    expect(screen.getByText('Shared by Dev User')).toBeDefined();
  });
});
