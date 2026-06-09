import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CookbookDetailPage } from './CookbookDetailPage';
import * as ClientContext from '../client/ClientContext';
import * as CookbookContext from '../context/CookbookContext';
import * as RecipeContext from '../context/RecipeContext';
import type { IClient, Cookbook as ClientCookbook, Recipe as ClientRecipe } from '../client/types';
import type { Cookbook as ViewCookbook } from '../types/Cookbook';

vi.mock('../client/ClientContext', () => ({
  useClient: vi.fn(),
}));

vi.mock('../context/CookbookContext', () => ({
  useCookbooks: vi.fn(),
}));

vi.mock('../context/RecipeContext', () => ({
  useRecipes: vi.fn(),
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

describe('CookbookDetailPage', () => {
  const cookbook: ClientCookbook = {
    id: 'cookbook-1',
    ownerId: 'owner-1',
    name: 'Weeknight Dinners',
    description: 'Fast meals',
    recipeCount: 1,
    isSystem: false,
    systemType: null,
    isPublic: false,
    createdAt: 1,
    updatedAt: 2,
    isOwner: false,
    ownerName: 'Alex',
  };

  const recipe: ClientRecipe = {
    id: 'recipe-1',
    title: 'Pesto Pasta',
    description: 'A fast pasta dinner',
    ingredients: ['pasta', 'pesto'],
    instructions: ['Boil pasta', 'Toss with pesto'],
    tags: ['dinner'],
    createdAt: 3,
    isOwner: false,
  };

  const viewCookbook: ViewCookbook = {
    ...cookbook,
    description: cookbook.description ?? undefined,
  };

  const getCookbook = vi.fn();
  const mockUpdateRecipe = vi.fn();
  const mockDeleteRecipe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getCookbook.mockReset();
    getCookbook.mockResolvedValue({
      data: {
        cookbook,
        recipes: [recipe],
      },
    });

    vi.mocked(ClientContext.useClient).mockReturnValue({
      cookbooks: {
        get: getCookbook,
        addRecipe: vi.fn(),
      },
      recipes: {
        create: vi.fn(),
      },
    } as unknown as IClient);

    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [],
      sharedCookbooks: [viewCookbook],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [],
      isLoading: false,
      addRecipe: vi.fn(),
      updateRecipe: mockUpdateRecipe,
      deleteRecipe: mockDeleteRecipe,
      getAllTags: vi.fn(() => []),
      refreshRecipes: vi.fn(),
    });
  });

  it('opens recipe details from the recipeId query param', async () => {
    render(
      <MemoryRouter initialEntries={['/cookbooks/cookbook-1?recipeId=recipe-1']}>
        <Routes>
          <Route
            path="/cookbooks/:id"
            element={
              <>
                <CookbookDetailPage />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getCookbook).toHaveBeenCalledWith('cookbook-1');
      expect(document.body.querySelector('.modal-detail .detail-title')?.textContent).toBe('Pesto Pasta');
    });

    fireEvent.click(screen.getByLabelText('Close'));

    await waitFor(() => {
      expect(document.body.querySelector('.modal-detail')).toBeNull();
      expect(screen.getByTestId('location').textContent).toBe('/cookbooks/cookbook-1');
    });
  });

  it('opens the recipe edit modal from cookbook recipe details', async () => {
    const ownedCookbook = { ...cookbook, isOwner: true, ownerName: undefined };
    const recipeWithoutOwnershipFlag = {
      ...recipe,
      isOwner: undefined,
    };

    getCookbook.mockResolvedValueOnce({
      data: {
        cookbook: ownedCookbook,
        recipes: [recipeWithoutOwnershipFlag],
      },
    });

    render(
      <MemoryRouter initialEntries={['/cookbooks/cookbook-1']}>
        <Routes>
          <Route path="/cookbooks/:id" element={<CookbookDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pesto Pasta')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Pesto Pasta'));
    const recipeDetail = document.body.querySelector('.modal-detail') as HTMLElement;
    fireEvent.click(within(recipeDetail).getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('heading', { name: 'Edit Recipe' })).toBeDefined();

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Edited Pesto Pasta' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update Recipe' }));

    await waitFor(() => {
      expect(mockUpdateRecipe).toHaveBeenCalledWith('recipe-1', {
        title: 'Edited Pesto Pasta',
        description: 'A fast pasta dinner',
        ingredients: ['pasta', 'pesto'],
        instructions: ['Boil pasta', 'Toss with pesto'],
        tags: ['dinner'],
        imageUrl: undefined,
        prepTime: undefined,
        cookTime: undefined,
        servings: undefined,
        sourceUrl: undefined,
        isPublic: false,
      });
      expect(screen.getByText('Edited Pesto Pasta')).toBeDefined();
    });
  });
});
