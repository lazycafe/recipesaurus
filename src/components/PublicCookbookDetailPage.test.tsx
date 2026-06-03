import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicCookbookDetailPage } from './PublicCookbookDetailPage';
import * as DiscoveryContext from '../context/DiscoveryContext';
import * as AuthContext from '../context/AuthContext';
import * as ToastContext from '../context/ToastContext';
import * as CookbookContext from '../context/CookbookContext';

vi.mock('../context/DiscoveryContext', () => ({
  useDiscovery: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../context/CookbookContext', () => ({
  useCookbooks: vi.fn(),
}));

function renderCookbookDetail() {
  return render(
    <MemoryRouter initialEntries={['/discover/cookbooks/cookbook-1']}>
      <Routes>
        <Route path="/discover/cookbooks/:id" element={<PublicCookbookDetailPage />} />
        <Route path="/cookbooks" element={<div>Cookbooks route</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PublicCookbookDetailPage', () => {
  const mockGetPublicCookbook = vi.fn();
  const mockSaveRecipe = vi.fn();
  const mockUnsaveRecipe = vi.fn();
  const mockUnsaveCookbook = vi.fn();
  const mockSaveCookbook = vi.fn();
  const mockRefreshCookbooks = vi.fn();
  const mockShowToast = vi.fn();

  const mockCookbook = {
    id: 'cookbook-1',
    name: 'Test Cookbook',
    description: 'A saved public cookbook',
    recipeCount: 1,
    ownerName: 'Test Chef',
    isOwner: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockRecipe = {
    id: 'recipe-1',
    title: 'Test Recipe',
    description: 'A test recipe',
    ingredients: ['ingredient 1'],
    instructions: ['step 1'],
    tags: ['dinner'],
    createdAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetPublicCookbook.mockResolvedValue({
      cookbook: mockCookbook,
      recipes: [mockRecipe],
    });
    mockSaveRecipe.mockResolvedValue('saved-recipe-1');
    mockUnsaveRecipe.mockResolvedValue(true);
    mockUnsaveCookbook.mockResolvedValue(true);
    mockSaveCookbook.mockResolvedValue('saved-cookbook-1');
    mockRefreshCookbooks.mockResolvedValue(undefined);

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      updateProfile: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      devLogin: vi.fn(),
    });

    vi.mocked(ToastContext.useToast).mockReturnValue({
      showToast: mockShowToast,
      hideToast: vi.fn(),
    });

    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: mockRefreshCookbooks,
    });

    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [],
      cookbooks: [],
      recipesTotal: 0,
      cookbooksTotal: 0,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: vi.fn(),
      loadCookbooks: vi.fn(),
      loadMoreRecipes: vi.fn(),
      loadMoreCookbooks: vi.fn(),
      setSelectedTags: vi.fn(),
      saveRecipe: mockSaveRecipe,
      saveCookbook: mockSaveCookbook,
      unsaveRecipe: mockUnsaveRecipe,
      unsaveCookbook: mockUnsaveCookbook,
      getPublicRecipe: vi.fn(),
      getPublicCookbook: mockGetPublicCookbook,
    });
  });

  it('shows a primary button to save the cookbook', async () => {
    renderCookbookDetail();

    const button = await screen.findByRole('button', { name: /save cookbook/i });

    expect(button.classList.contains('btn-primary')).toBe(true);
  });

  it('saves the cookbook from the detail page', async () => {
    renderCookbookDetail();

    fireEvent.click(await screen.findByRole('button', { name: /save cookbook/i }));

    await waitFor(() => {
      expect(mockSaveCookbook).toHaveBeenCalledWith('cookbook-1');
    });
    expect(mockRefreshCookbooks).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Cookbook saved to your collection',
      type: 'success',
    }));
    expect(screen.getByRole('button', { name: /saved/i })).toBeDefined();
  });

  it('shows saved feedback after saving a recipe in the cookbook', async () => {
    renderCookbookDetail();

    fireEvent.click(await screen.findByLabelText('Save recipe'));

    await waitFor(() => {
      expect(mockSaveRecipe).toHaveBeenCalledWith('recipe-1');
    });
    expect(screen.getByLabelText('Unsave recipe')).toBeDefined();
  });
});
