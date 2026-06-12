import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecipeDetail } from './RecipeDetail';
import { downloadRecipePdf } from '../utils/recipePdf';
import type { Recipe } from '../types/Recipe';

vi.mock('../utils/recipePdf', () => ({
  downloadRecipePdf: vi.fn(),
}));

describe('RecipeDetail', () => {
  const recipe: Recipe = {
    id: 'recipe-1',
    title: 'Skillet Pancakes',
    description: 'A cozy breakfast recipe',
    ingredients: ['1 cup flour', '2 eggs'],
    instructions: ['Mix batter', 'Cook until golden'],
    tags: ['breakfast'],
    prepTime: '10 mins',
    cookTime: '15 mins',
    servings: '4',
    sourceUrl: 'https://example.com/pancakes',
    createdAt: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('downloads the recipe PDF from the modal action row', () => {
    render(
      <MemoryRouter>
        <RecipeDetail recipe={recipe} onClose={vi.fn()} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    expect(downloadRecipePdf).toHaveBeenCalledWith(recipe);
  });

  it('adds a unique recipe route while the detail modal is open', () => {
    window.history.replaceState({}, '', '/discover/recipes?tag=breakfast');

    render(
      <MemoryRouter>
        <RecipeDetail recipe={recipe} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(window.location.pathname).toBe('/discover/recipes');
    expect(window.location.search).toBe('?tag=breakfast&recipe=recipe-1');
  });

  it('clears the recipe route when closing a directly loaded modal route', () => {
    const onClose = vi.fn();
    window.history.replaceState({}, '', '/discover/recipes?recipe=recipe-1');

    render(
      <MemoryRouter>
        <RecipeDetail recipe={recipe} onClose={onClose} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/discover/recipes');
    expect(window.location.search).toBe('');
  });

  it('normalizes and clears legacy recipeId modal routes without reopening them', () => {
    const onClose = vi.fn();
    window.history.replaceState({}, '', '/cookbooks/cookbook-1?recipeId=recipe-1');

    render(
      <MemoryRouter>
        <RecipeDetail recipe={recipe} onClose={onClose} />
      </MemoryRouter>
    );

    expect(window.location.search).toBe('?recipe=recipe-1');

    fireEvent.click(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/cookbooks/cookbook-1');
    expect(window.location.search).toBe('');
  });

  it('keeps share and PDF download actions on public recipes with save', () => {
    const onSave = vi.fn();

    render(
      <MemoryRouter>
        <RecipeDetail
          recipe={recipe}
          onClose={vi.fn()}
          onSave={onSave}
          saveLabel="Save Recipe"
          isPublicView
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Share' })).toBeDefined();
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('keeps share and PDF download actions on owned recipes without save', () => {
    render(
      <MemoryRouter>
        <RecipeDetail recipe={{ ...recipe, isOwner: true }} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Share' })).toBeDefined();
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Save Recipe' })).toBeNull();
  });

  it('shows save on recipes that are explicitly not owned', () => {
    const onSave = vi.fn();

    render(
      <MemoryRouter>
        <RecipeDetail
          recipe={{ ...recipe, isOwner: false }}
          onClose={vi.fn()}
          onSave={onSave}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows a disabled saved action for public recipes already in My Recipes', () => {
    render(
      <MemoryRouter>
        <RecipeDetail
          recipe={recipe}
          onClose={vi.fn()}
          onSave={vi.fn()}
          isPublicView
          isSaved
        />
      </MemoryRouter>
    );

    const savedButton = screen.getByRole('button', { name: 'Saved to My Recipes' }) as HTMLButtonElement;
    expect(savedButton.disabled).toBe(true);
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeDefined();
  });

  it('closes when browser history goes back from the detail entry', () => {
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <RecipeDetail recipe={recipe} onClose={onClose} />
      </MemoryRouter>
    );

    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
