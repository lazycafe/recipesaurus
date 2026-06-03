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
});
