import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareCookbookModal } from './ShareCookbookModal';
import * as ClientContext from '../client/ClientContext';
import type { IClient } from '../client/types';
import type { Cookbook } from '../types/Cookbook';

vi.mock('../client/ClientContext', () => ({
  useClient: vi.fn(),
}));

describe('ShareCookbookModal', () => {
  const mockGetShares = vi.fn();
  const mockCreateShareLink = vi.fn();
  const mockShareByEmail = vi.fn();
  const mockRemoveShare = vi.fn();
  const mockRevokeShareLink = vi.fn();
  const mockWriteText = vi.fn();

  const cookbook: Cookbook = {
    id: 'cookbook-1',
    name: 'Sunday Dinners',
    description: 'Family favorites',
    recipeCount: 3,
    createdAt: 1,
    updatedAt: 1,
    isOwner: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetShares.mockResolvedValue({ data: { shares: [], links: [] } });
    mockCreateShareLink.mockResolvedValue({
      data: {
        id: 'link-1',
        token: 'abcdef1234567890',
        isActive: true,
        createdAt: 2,
      },
    });
    mockShareByEmail.mockResolvedValue({ data: { success: true } });
    mockRemoveShare.mockResolvedValue({ data: { success: true } });
    mockRevokeShareLink.mockResolvedValue({ data: { success: true } });
    mockWriteText.mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
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
        shareByEmail: mockShareByEmail,
        removeShare: mockRemoveShare,
        getShares: mockGetShares,
        createShareLink: mockCreateShareLink,
        revokeShareLink: mockRevokeShareLink,
        getShared: vi.fn(),
      },
      notifications: {} as IClient['notifications'],
      invites: {} as IClient['invites'],
      ai: {} as IClient['ai'],
      billing: {} as IClient['billing'],
      discover: {} as IClient['discover'],
    });
  });

  it('generates a link with the configured client and shows the full share URL', async () => {
    render(<ShareCookbookModal cookbook={cookbook} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(mockGetShares).toHaveBeenCalledWith('cookbook-1');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Share Link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate New Link' }));

    await waitFor(() => {
      expect(mockCreateShareLink).toHaveBeenCalledWith('cookbook-1');
    });

    expect(screen.getByText(`${window.location.origin}/shared/abcdef1234567890`)).toBeDefined();
    expect(screen.queryByText(/abcdef12\.\.\./)).toBeNull();
  });

  it('copies the full generated share URL', async () => {
    mockGetShares.mockResolvedValue({
      data: {
        shares: [],
        links: [
          {
            id: 'link-1',
            token: 'abcdef1234567890',
            isActive: true,
            createdAt: 2,
          },
        ],
      },
    });

    render(<ShareCookbookModal cookbook={cookbook} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Share Link' }));

    await waitFor(() => {
      expect(screen.getByText(`${window.location.origin}/shared/abcdef1234567890`)).toBeDefined();
    });

    fireEvent.click(screen.getByTitle('Copy link'));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(`${window.location.origin}/shared/abcdef1234567890`);
    });
  });
});
