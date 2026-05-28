import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareRecipeModal } from './ShareRecipeModal';
import type { Recipe } from '../types/Recipe';

describe('ShareRecipeModal', () => {
  const mockWriteText = vi.fn();
  const recipe: Recipe = {
    id: 'recipe-1',
    title: 'Herb Chicken',
    description: 'A bright weeknight dinner',
    ingredients: ['chicken', 'herbs'],
    instructions: ['Season chicken', 'Bake until done'],
    tags: ['dinner'],
    prepTime: '10 mins',
    cookTime: '25 mins',
    servings: '4',
    sourceUrl: 'https://example.com/recipe',
    createdAt: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
    });
  });

  it('copies a public preview URL for shared recipes', async () => {
    render(<ShareRecipeModal recipe={recipe} onClose={vi.fn()} />);

    fireEvent.click(screen.getByTitle('Copy link'));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledOnce();
    });

    const copiedUrl = mockWriteText.mock.calls[0][0] as string;
    expect(copiedUrl).toContain('/preview/');
    expect(copiedUrl).not.toContain('/recipe/');
  });
});
