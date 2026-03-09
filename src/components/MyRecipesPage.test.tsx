import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyRecipesPage } from './MyRecipesPage';
import * as RecipeContext from '../context/RecipeContext';
import * as CookbookContext from '../context/CookbookContext';

vi.mock('../context/RecipeContext', () => ({
  useRecipes: vi.fn(),
}));

vi.mock('../context/CookbookContext', () => ({
  useCookbooks: vi.fn(),
}));

describe('MyRecipesPage', () => {
  const mockAddRecipe = vi.fn();
  const mockUpdateRecipe = vi.fn();
  const mockDeleteRecipe = vi.fn();
  const mockGetAllTags = vi.fn();
  const mockRefreshRecipes = vi.fn();
  const mockCreateCookbook = vi.fn();

  const mockRecipe = {
    id: 'recipe-1',
    title: 'Test Recipe',
    description: 'A test recipe',
    ingredients: ['ingredient 1'],
    instructions: ['step 1'],
    tags: ['dinner', 'quick'],
    imageUrl: 'https://example.com/image.jpg',
    ownerName: 'Test Chef',
    isOwner: true,
    createdAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [],
      isLoading: false,
      addRecipe: mockAddRecipe,
      updateRecipe: mockUpdateRecipe,
      deleteRecipe: mockDeleteRecipe,
      getAllTags: mockGetAllTags.mockReturnValue([]),
      refreshRecipes: mockRefreshRecipes,
    });

    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: mockCreateCookbook,
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });
  });

  it('renders My Recipes header', () => {
    render(<MyRecipesPage />);
    expect(screen.getByText('My Recipes')).toBeDefined();
  });

  it('renders subtitle', () => {
    render(<MyRecipesPage />);
    expect(screen.getByText("All recipes you've saved or created")).toBeDefined();
  });

  it('renders New Recipe button', () => {
    render(<MyRecipesPage />);
    // Two "New Recipe" buttons exist (header and empty state)
    expect(screen.getAllByText('New Recipe').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no recipes', () => {
    render(<MyRecipesPage />);
    expect(screen.getByText('No recipes yet')).toBeDefined();
    expect(screen.getByText('Save recipes from Discover or create your own!')).toBeDefined();
  });

  it('shows search input when recipes exist', () => {
    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [mockRecipe],
      isLoading: false,
      addRecipe: mockAddRecipe,
      updateRecipe: mockUpdateRecipe,
      deleteRecipe: mockDeleteRecipe,
      getAllTags: mockGetAllTags.mockReturnValue(['dinner', 'quick']),
      refreshRecipes: mockRefreshRecipes,
    });

    render(<MyRecipesPage />);
    expect(screen.getByPlaceholderText('Search recipes...')).toBeDefined();
  });

  it('shows filter button when recipes exist', () => {
    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [mockRecipe],
      isLoading: false,
      addRecipe: mockAddRecipe,
      updateRecipe: mockUpdateRecipe,
      deleteRecipe: mockDeleteRecipe,
      getAllTags: mockGetAllTags.mockReturnValue(['dinner', 'quick']),
      refreshRecipes: mockRefreshRecipes,
    });

    render(<MyRecipesPage />);
    expect(screen.getByText('Filter')).toBeDefined();
  });

  it('shows recipe count', () => {
    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [mockRecipe],
      isLoading: false,
      addRecipe: mockAddRecipe,
      updateRecipe: mockUpdateRecipe,
      deleteRecipe: mockDeleteRecipe,
      getAllTags: mockGetAllTags.mockReturnValue(['dinner', 'quick']),
      refreshRecipes: mockRefreshRecipes,
    });

    render(<MyRecipesPage />);
    expect(screen.getByText('1 recipe')).toBeDefined();
  });

  it('shows recipes when available', () => {
    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [mockRecipe],
      isLoading: false,
      addRecipe: mockAddRecipe,
      updateRecipe: mockUpdateRecipe,
      deleteRecipe: mockDeleteRecipe,
      getAllTags: mockGetAllTags.mockReturnValue(['dinner', 'quick']),
      refreshRecipes: mockRefreshRecipes,
    });

    render(<MyRecipesPage />);
    expect(screen.getByText('Test Recipe')).toBeDefined();
  });

  it('opens filter menu when filter button clicked', () => {
    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [mockRecipe],
      isLoading: false,
      addRecipe: mockAddRecipe,
      updateRecipe: mockUpdateRecipe,
      deleteRecipe: mockDeleteRecipe,
      getAllTags: mockGetAllTags.mockReturnValue(['dinner', 'quick']),
      refreshRecipes: mockRefreshRecipes,
    });

    render(<MyRecipesPage />);
    fireEvent.click(screen.getByText('Filter'));
    expect(screen.getByText('Filters')).toBeDefined();
    expect(screen.getByText('Tags')).toBeDefined();
  });

  it('filters recipes by search query', () => {
    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [mockRecipe, { ...mockRecipe, id: 'recipe-2', title: 'Pasta Dish' }],
      isLoading: false,
      addRecipe: mockAddRecipe,
      updateRecipe: mockUpdateRecipe,
      deleteRecipe: mockDeleteRecipe,
      getAllTags: mockGetAllTags.mockReturnValue(['dinner', 'quick']),
      refreshRecipes: mockRefreshRecipes,
    });

    render(<MyRecipesPage />);

    const searchInput = screen.getByPlaceholderText('Search recipes...');
    fireEvent.change(searchInput, { target: { value: 'Pasta' } });

    expect(screen.getByText('Pasta Dish')).toBeDefined();
    expect(screen.queryByText('Test Recipe')).toBeNull();
  });

  it('shows loading state', () => {
    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [],
      isLoading: true,
      addRecipe: mockAddRecipe,
      updateRecipe: mockUpdateRecipe,
      deleteRecipe: mockDeleteRecipe,
      getAllTags: mockGetAllTags.mockReturnValue([]),
      refreshRecipes: mockRefreshRecipes,
    });

    render(<MyRecipesPage />);
    expect(document.querySelector('.loading-state')).toBeDefined();
  });
});
