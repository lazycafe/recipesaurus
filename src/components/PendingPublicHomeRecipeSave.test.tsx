import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDiscovery } from '../context/DiscoveryContext';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';
import { storePendingPublicHomeRecipeSave } from '../utils/pendingPublicHomeRecipeSave';
import { PendingPublicHomeRecipeSave } from './PendingPublicHomeRecipeSave';

vi.mock('../context/DiscoveryContext', () => ({
  useDiscovery: vi.fn(),
}));

vi.mock('../context/RecipeContext', () => ({
  useRecipes: vi.fn(),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: vi.fn(),
}));

describe('PendingPublicHomeRecipeSave', () => {
  const mockSaveRecipe = vi.fn();
  const mockRefreshRecipes = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    mockSaveRecipe.mockResolvedValue('saved-recipe-1');
    mockRefreshRecipes.mockResolvedValue(undefined);
    vi.mocked(useDiscovery).mockReturnValue({ saveRecipe: mockSaveRecipe } as unknown as ReturnType<typeof useDiscovery>);
    vi.mocked(useRecipes).mockReturnValue({ refreshRecipes: mockRefreshRecipes } as unknown as ReturnType<typeof useRecipes>);
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast } as unknown as ReturnType<typeof useToast>);
  });

  it('saves a pending public home recipe after auth', async () => {
    storePendingPublicHomeRecipeSave({
      id: 'public-recipe-1',
      title: 'Public Pasta',
    });

    render(
      <MemoryRouter>
        <PendingPublicHomeRecipeSave />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockSaveRecipe).toHaveBeenCalledWith('public-recipe-1');
    });

    expect(mockRefreshRecipes).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('pendingPublicHomeRecipeSave')).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Public Pasta saved to My Recipes',
      type: 'success',
    }));
  });

  it('finishes a pending save even if the first mounted handler cleans up', async () => {
    storePendingPublicHomeRecipeSave({
      id: 'public-recipe-1',
      title: 'Public Pasta',
    });

    const { unmount } = render(
      <MemoryRouter>
        <PendingPublicHomeRecipeSave />
      </MemoryRouter>
    );

    unmount();

    render(
      <MemoryRouter>
        <PendingPublicHomeRecipeSave />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockSaveRecipe).toHaveBeenCalledWith('public-recipe-1');
    });

    expect(mockSaveRecipe).toHaveBeenCalledTimes(1);
    expect(mockRefreshRecipes).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('pendingPublicHomeRecipeSave')).toBeNull();
  });

  it('does nothing when there is no pending public home save', async () => {
    render(
      <MemoryRouter>
        <PendingPublicHomeRecipeSave />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockSaveRecipe).not.toHaveBeenCalled();
    });
    expect(mockRefreshRecipes).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('shows an error toast when the pending save fails', async () => {
    mockSaveRecipe.mockResolvedValue(null);
    storePendingPublicHomeRecipeSave({
      id: 'public-recipe-1',
      title: 'Public Pasta',
    });

    render(
      <MemoryRouter>
        <PendingPublicHomeRecipeSave />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Could not save Public Pasta. Please try again.',
        type: 'error',
      });
    });

    expect(mockRefreshRecipes).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('pendingPublicHomeRecipeSave')).toContain('Public Pasta');
  });
});
