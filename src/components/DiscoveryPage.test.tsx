import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { DiscoveryPage } from './DiscoveryPage';
import * as DiscoveryContext from '../context/DiscoveryContext';
import * as AuthContext from '../context/AuthContext';
import * as ToastContext from '../context/ToastContext';
import * as RecipeContext from '../context/RecipeContext';
import * as CookbookContext from '../context/CookbookContext';

// Mock the contexts
vi.mock('../context/DiscoveryContext', () => ({
  useDiscovery: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../context/RecipeContext', () => ({
  useRecipes: vi.fn(),
}));

vi.mock('../context/CookbookContext', () => ({
  useCookbooks: vi.fn(),
}));

function renderWithRouter(ui: ReactElement) {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );
}

describe('DiscoveryPage', () => {
  const mockLoadRecipes = vi.fn();
  const mockLoadCookbooks = vi.fn();
  const mockLoadMoreRecipes = vi.fn();
  const mockLoadMoreCookbooks = vi.fn();
  const mockSetSelectedTags = vi.fn();
  const mockSaveRecipe = vi.fn();
  const mockSaveCookbook = vi.fn();
  const mockRefreshRecipes = vi.fn();
  const mockRefreshCookbooks = vi.fn();
  const mockUnsaveRecipe = vi.fn();
  const mockUnsaveCookbook = vi.fn();

  const mockRecipe = {
    id: 'recipe-1',
    title: 'Test Recipe',
    description: 'A test recipe',
    ingredients: ['ingredient 1'],
    instructions: ['step 1'],
    tags: ['dinner', 'quick'],
    imageUrl: 'https://example.com/image.jpg',
    ownerName: 'Test Chef',
    createdAt: Date.now(),
  };

  const mockCookbook = {
    id: 'cookbook-1',
    name: 'Test Cookbook',
    description: 'A test cookbook',
    recipeCount: 5,
    ownerName: 'Test Chef',
    isOwner: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveRecipe.mockResolvedValue('saved-recipe-1');
    mockSaveCookbook.mockResolvedValue('saved-cookbook-1');
    mockRefreshRecipes.mockResolvedValue(undefined);
    mockRefreshCookbooks.mockResolvedValue(undefined);
    mockUnsaveRecipe.mockResolvedValue(true);
    mockUnsaveCookbook.mockResolvedValue(true);

    vi.mocked(ToastContext.useToast).mockReturnValue({
      showToast: vi.fn(),
      hideToast: vi.fn(),
    });

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

    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [],
      cookbooks: [],
      recipesTotal: 0,
      cookbooksTotal: 0,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: mockSaveCookbook,
      unsaveRecipe: mockUnsaveRecipe,
      unsaveCookbook: mockUnsaveCookbook,
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [],
      isLoading: false,
      addRecipe: vi.fn(),
      updateRecipe: vi.fn(),
      deleteRecipe: vi.fn(),
      getAllTags: vi.fn().mockReturnValue([]),
      refreshRecipes: mockRefreshRecipes,
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
  });

  it('renders Discover header', () => {
    renderWithRouter(<DiscoveryPage />);
    expect(screen.getByText('Discover')).toBeDefined();
  });

  it('renders search input', () => {
    renderWithRouter(<DiscoveryPage />);
    expect(screen.getByPlaceholderText('Search recipes...')).toBeDefined();
  });

  it('renders cookbook search input on the cookbooks tab', () => {
    renderWithRouter(<DiscoveryPage tab="cookbooks" />);
    expect(screen.getByPlaceholderText('Search cookbooks...')).toBeDefined();
  });

  it('renders trending tags', () => {
    renderWithRouter(<DiscoveryPage />);
    expect(screen.getByText('Trending:')).toBeDefined();
    expect(screen.getByText('dinner')).toBeDefined();
    expect(screen.getByText('quick')).toBeDefined();
    expect(screen.getByText('healthy')).toBeDefined();
  });

  it('renders Recipes and Cookbooks tabs', () => {
    renderWithRouter(<DiscoveryPage />);
    expect(screen.getByText('Recipes')).toBeDefined();
    expect(screen.getByText('Cookbooks')).toBeDefined();
  });

  it('loads recipes on mount', () => {
    renderWithRouter(<DiscoveryPage />);
    expect(mockLoadRecipes).toHaveBeenCalled();
  });

  it('loads cookbooks on mount', () => {
    renderWithRouter(<DiscoveryPage />);
    expect(mockLoadCookbooks).toHaveBeenCalled();
  });

  it('shows empty state when no recipes', () => {
    renderWithRouter(<DiscoveryPage />);
    expect(screen.getByText('No recipes found')).toBeDefined();
  });

  it('shows recipes when available', () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [mockRecipe],
      cookbooks: [],
      recipesTotal: 1,
      cookbooksTotal: 0,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: vi.fn(),
      unsaveRecipe: vi.fn(),
      unsaveCookbook: vi.fn(),
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage />);
    expect(screen.getByText('Test Recipe')).toBeDefined();
    expect(screen.getByText('by Test Chef')).toBeDefined();
  });

  it('shows a yours badge instead of a save button for owned recipes', () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [{ ...mockRecipe, isOwner: true }],
      cookbooks: [],
      recipesTotal: 1,
      cookbooksTotal: 0,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: mockSaveCookbook,
      unsaveRecipe: mockUnsaveRecipe,
      unsaveCookbook: mockUnsaveCookbook,
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage />);

    expect(screen.getByText('yours')).toBeDefined();
    expect(screen.getByLabelText('You own this recipe')).toBeDefined();
    expect(screen.queryByLabelText('Save recipe')).toBeNull();
  });

  it('saves a recipe from Discover', async () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [mockRecipe],
      cookbooks: [],
      recipesTotal: 1,
      cookbooksTotal: 0,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: mockSaveCookbook,
      unsaveRecipe: mockUnsaveRecipe,
      unsaveCookbook: mockUnsaveCookbook,
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage />);
    fireEvent.click(screen.getByLabelText('Save recipe'));

    await waitFor(() => {
      expect(mockSaveRecipe).toHaveBeenCalledWith('recipe-1');
    });
    expect(mockRefreshRecipes).toHaveBeenCalled();
  });

  it('renders duplicate recipes only once', () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [mockRecipe, { ...mockRecipe }],
      cookbooks: [],
      recipesTotal: 1,
      cookbooksTotal: 0,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: vi.fn(),
      unsaveRecipe: vi.fn(),
      unsaveCookbook: vi.fn(),
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage />);
    expect(screen.getAllByText('Test Recipe')).toHaveLength(1);
  });

  it('shows loading state for recipes', () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [],
      cookbooks: [],
      recipesTotal: 0,
      cookbooksTotal: 0,
      isLoadingRecipes: true,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: vi.fn(),
      unsaveRecipe: vi.fn(),
      unsaveCookbook: vi.fn(),
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage />);
    expect(screen.getByText('Loading recipes...')).toBeDefined();
  });

  it('shows cookbooks on the cookbooks tab', () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [],
      cookbooks: [mockCookbook],
      recipesTotal: 0,
      cookbooksTotal: 1,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: vi.fn(),
      unsaveRecipe: vi.fn(),
      unsaveCookbook: vi.fn(),
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage tab="cookbooks" />);
    expect(screen.getByText('Test Cookbook')).toBeDefined();
  });

  it('shows a yours badge instead of a save button for owned cookbooks', () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [],
      cookbooks: [{ ...mockCookbook, isOwner: true }],
      recipesTotal: 0,
      cookbooksTotal: 1,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: mockSaveCookbook,
      unsaveRecipe: mockUnsaveRecipe,
      unsaveCookbook: mockUnsaveCookbook,
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage tab="cookbooks" />);

    expect(screen.getByText('yours')).toBeDefined();
    expect(screen.getByLabelText('You own this cookbook')).toBeDefined();
    expect(screen.queryByLabelText('Save cookbook')).toBeNull();
  });

  it('saves a cookbook from Discover', async () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [],
      cookbooks: [mockCookbook],
      recipesTotal: 0,
      cookbooksTotal: 1,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: mockSaveCookbook,
      unsaveRecipe: mockUnsaveRecipe,
      unsaveCookbook: mockUnsaveCookbook,
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage tab="cookbooks" />);
    fireEvent.click(screen.getByLabelText('Save cookbook'));

    await waitFor(() => {
      expect(mockSaveCookbook).toHaveBeenCalledWith('cookbook-1');
    });
    expect(mockRefreshCookbooks).toHaveBeenCalled();
  });

  it('renders duplicate cookbooks only once', () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [],
      cookbooks: [mockCookbook, { ...mockCookbook }],
      recipesTotal: 0,
      cookbooksTotal: 1,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: vi.fn(),
      unsaveRecipe: vi.fn(),
      unsaveCookbook: vi.fn(),
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage tab="cookbooks" />);
    expect(screen.getAllByText('Test Cookbook')).toHaveLength(1);
  });

  it('toggles tag filter when clicked', () => {
    renderWithRouter(<DiscoveryPage />);
    fireEvent.click(screen.getByText('dinner'));
    expect(mockSetSelectedTags).toHaveBeenCalledWith(['dinner']);
  });

  it('shows clear button when tags are selected', () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [],
      cookbooks: [],
      recipesTotal: 0,
      cookbooksTotal: 0,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: ['dinner'],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: vi.fn(),
      unsaveRecipe: vi.fn(),
      unsaveCookbook: vi.fn(),
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage />);
    expect(screen.getByText('Clear')).toBeDefined();
  });

  it('clears tags when clear button clicked', () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [],
      cookbooks: [],
      recipesTotal: 0,
      cookbooksTotal: 0,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: ['dinner'],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: vi.fn(),
      unsaveRecipe: vi.fn(),
      unsaveCookbook: vi.fn(),
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage />);
    fireEvent.click(screen.getByText('Clear'));
    expect(mockSetSelectedTags).toHaveBeenCalledWith([]);
  });

  it('shows infinite scroll sentinel when more recipes available', () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [mockRecipe],
      cookbooks: [],
      recipesTotal: 50,
      cookbooksTotal: 0,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: vi.fn(),
      unsaveRecipe: vi.fn(),
      unsaveCookbook: vi.fn(),
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage />);
    // Infinite scroll uses a sentinel element instead of a button
    const sentinel = document.querySelector('.infinite-scroll-sentinel');
    expect(sentinel).toBeDefined();
  });

  it('renders sentinel for infinite scroll to trigger loadMoreRecipes', () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [mockRecipe],
      cookbooks: [],
      recipesTotal: 50,
      cookbooksTotal: 0,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: vi.fn(),
      unsaveRecipe: vi.fn(),
      unsaveCookbook: vi.fn(),
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage />);
    // The infinite scroll sentinel is present for triggering loadMore
    const sentinel = document.querySelector('.infinite-scroll-sentinel');
    expect(sentinel).not.toBeNull();
  });

  it('filters recipes by search query', () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [mockRecipe, { ...mockRecipe, id: 'recipe-2', title: 'Pasta Dish' }],
      cookbooks: [],
      recipesTotal: 2,
      cookbooksTotal: 0,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: vi.fn(),
      unsaveRecipe: vi.fn(),
      unsaveCookbook: vi.fn(),
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage />);

    const searchInput = screen.getByPlaceholderText('Search recipes...');
    fireEvent.change(searchInput, { target: { value: 'Pasta' } });

    expect(screen.getByText('Pasta Dish')).toBeDefined();
    expect(screen.queryByText('Test Recipe')).toBeNull();
  });

  it('shows recipe count in tab', () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [mockRecipe],
      cookbooks: [],
      recipesTotal: 25,
      cookbooksTotal: 10,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: vi.fn(),
      unsaveRecipe: vi.fn(),
      unsaveCookbook: vi.fn(),
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage />);
    expect(screen.getByText('(25)')).toBeDefined();
    expect(screen.getByText('(10)')).toBeDefined();
  });

  it('renders a saved recipe heart as selected and unsaves on click', async () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [{ ...mockRecipe, isSaved: true, savedCopyId: 'saved-recipe-1' }],
      cookbooks: [],
      recipesTotal: 1,
      cookbooksTotal: 0,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: mockSaveCookbook,
      unsaveRecipe: mockUnsaveRecipe,
      unsaveCookbook: mockUnsaveCookbook,
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage />);

    const unsaveButton = screen.getByRole('button', { name: 'Unsave recipe' });
    expect(unsaveButton.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(unsaveButton);

    await waitFor(() => {
      expect(mockUnsaveRecipe).toHaveBeenCalledWith('recipe-1');
    });
    expect(mockSaveRecipe).not.toHaveBeenCalled();
  });

  it('renders a saved cookbook heart as selected and unsaves on click', async () => {
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue({
      recipes: [],
      cookbooks: [{ ...mockCookbook, isSaved: true, savedCopyId: 'saved-cookbook-1' }],
      recipesTotal: 0,
      cookbooksTotal: 1,
      isLoadingRecipes: false,
      isLoadingCookbooks: false,
      selectedTags: [],
      loadRecipes: mockLoadRecipes,
      loadCookbooks: mockLoadCookbooks,
      loadMoreRecipes: mockLoadMoreRecipes,
      loadMoreCookbooks: mockLoadMoreCookbooks,
      setSelectedTags: mockSetSelectedTags,
      saveRecipe: mockSaveRecipe,
      saveCookbook: mockSaveCookbook,
      unsaveRecipe: mockUnsaveRecipe,
      unsaveCookbook: mockUnsaveCookbook,
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    renderWithRouter(<DiscoveryPage tab="cookbooks" />);

    const unsaveButton = screen.getByRole('button', { name: 'Unsave cookbook' });
    expect(unsaveButton.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(unsaveButton);

    await waitFor(() => {
      expect(mockUnsaveCookbook).toHaveBeenCalledWith('cookbook-1');
    });
    expect(mockSaveCookbook).not.toHaveBeenCalled();
  });
});
