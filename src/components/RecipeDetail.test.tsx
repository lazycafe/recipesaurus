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
