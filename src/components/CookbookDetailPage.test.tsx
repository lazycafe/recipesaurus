import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CookbookDetailPage } from './CookbookDetailPage';
import * as ClientContext from '../client/ClientContext';
import * as CookbookContext from '../context/CookbookContext';
import * as RecipeContext from '../context/RecipeContext';
import type { IClient, Cookbook, Recipe } from '../client/types';

vi.mock('../client/ClientContext', () => ({
  useClient: vi.fn(),
}));

vi.mock('../context/CookbookContext', () => ({
  useCookbooks: vi.fn(),
}));

vi.mock('../context/RecipeContext', () => ({
  useRecipes: vi.fn(),
}));

describe('CookbookDetailPage', () => {
  const mockCookbook: Cookbook = {
    id: 'cookbook-1',
    ownerId: 'user-1',
    name: 'Dinner',
    description: 'Weeknight dinners',
    recipeCount: 1,
    isSystem: false,
    isPublic: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isOwner: true,
    ownerName: 'Test User',
  };

  const mockRecipe: Recipe = {
    id: 'recipe-1',
    title: 'Pasta',
    description: 'A cozy pasta dinner',
    ingredients: ['noodles', 'tomato sauce'],
    instructions: ['Boil pasta', 'Add sauce'],
    tags: ['dinner'],
    imageUrl: null,
    sourceUrl: null,
    prepTime: null,
    cookTime: null,
    servings: null,
    isPublic: false,
    ownerId: 'user-1',
    ownerName: 'Test User',
    isOwner: true,
    createdAt: Date.now(),
    addedByUserId: 'user-1',
    addedByUserName: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(ClientContext.useClient).mockReturnValue({
      cookbooks: {
        get: vi.fn().mockResolvedValue({
          data: {
            cookbook: mockCookbook,
            recipes: [mockRecipe],
          },
        }),
      },
    } as unknown as IClient);

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
      refreshCookbooks: vi.fn(),
    });

    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [],
      isLoading: false,
      addRecipe: vi.fn(),
      updateRecipe: vi.fn(),
      deleteRecipe: vi.fn(),
      getAllTags: vi.fn(() => []),
      refreshRecipes: vi.fn(),
    });
  });

  it('opens a recipe detail from the recipeId URL param', async () => {
    render(
      <MemoryRouter initialEntries={['/cookbooks/cookbook-1?recipeId=recipe-1']}>
        <Routes>
          <Route path="/cookbooks/:id" element={<CookbookDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('noodles')).toBeDefined();
    expect(screen.getByText('Ingredients')).toBeDefined();
  });
});
