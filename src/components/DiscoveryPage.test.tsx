import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiscoveryPage } from './DiscoveryPage';
import * as DiscoveryContext from '../context/DiscoveryContext';
import * as AuthContext from '../context/AuthContext';
import * as ToastContext from '../context/ToastContext';

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

describe('DiscoveryPage', () => {
  const mockLoadRecipes = vi.fn();
  const mockLoadCookbooks = vi.fn();
  const mockLoadMoreRecipes = vi.fn();
  const mockLoadMoreCookbooks = vi.fn();
  const mockSetSelectedTags = vi.fn();
  const mockSaveRecipe = vi.fn();

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
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });
  });

  it('renders Discover header', () => {
    render(<DiscoveryPage />);
    expect(screen.getByText('Discover')).toBeDefined();
  });

  it('renders search input', () => {
    render(<DiscoveryPage />);
    expect(screen.getByPlaceholderText('Search recipes and cookbooks...')).toBeDefined();
  });

  it('renders trending tags', () => {
    render(<DiscoveryPage />);
    expect(screen.getByText('Trending:')).toBeDefined();
    expect(screen.getByText('dinner')).toBeDefined();
    expect(screen.getByText('quick')).toBeDefined();
    expect(screen.getByText('healthy')).toBeDefined();
  });

  it('renders Recipes and Cookbooks tabs', () => {
    render(<DiscoveryPage />);
    expect(screen.getByText('Recipes')).toBeDefined();
    expect(screen.getByText('Cookbooks')).toBeDefined();
  });

  it('loads recipes on mount', () => {
    render(<DiscoveryPage />);
    expect(mockLoadRecipes).toHaveBeenCalled();
  });

  it('loads cookbooks on mount', () => {
    render(<DiscoveryPage />);
    expect(mockLoadCookbooks).toHaveBeenCalled();
  });

  it('shows empty state when no recipes', () => {
    render(<DiscoveryPage />);
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
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    render(<DiscoveryPage />);
    expect(screen.getByText('Test Recipe')).toBeDefined();
    expect(screen.getByText('by Test Chef')).toBeDefined();
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
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    render(<DiscoveryPage />);
    expect(screen.getByText('Loading recipes...')).toBeDefined();
  });

  it('switches to cookbooks tab when clicked', () => {
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
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    render(<DiscoveryPage />);
    fireEvent.click(screen.getByText('Cookbooks'));
    expect(screen.getByText('Test Cookbook')).toBeDefined();
  });

  it('toggles tag filter when clicked', () => {
    render(<DiscoveryPage />);
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
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    render(<DiscoveryPage />);
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
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    render(<DiscoveryPage />);
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
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    render(<DiscoveryPage />);
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
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    render(<DiscoveryPage />);
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
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    render(<DiscoveryPage />);

    const searchInput = screen.getByPlaceholderText('Search recipes and cookbooks...');
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
      getPublicRecipe: vi.fn(),
      getPublicCookbook: vi.fn(),
    });

    render(<DiscoveryPage />);
    expect(screen.getByText('(25)')).toBeDefined();
    expect(screen.getByText('(10)')).toBeDefined();
  });
});
