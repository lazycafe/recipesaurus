import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RecipeDetail } from './RecipeDetail';
import type { Recipe } from '../client/types';

describe('RecipeDetail', () => {
  const remixedRecipe: Recipe = {
    id: 'remix-1',
    title: 'Spicy Citrus Noodles',
    description: 'Bright noodles with heat',
    ingredients: ['noodles', 'lime', 'chili crisp'],
    instructions: ['Boil noodles', 'Toss with lime and chili crisp'],
    tags: ['dinner', 'spicy'],
    isPublic: true,
    ownerId: 'user-2',
    ownerName: 'Remixer',
    isOwner: true,
    createdAt: 123,
    sourceRecipeId: 'recipe-1',
    sourceRecipe: {
      id: 'recipe-1',
      title: 'Original Citrus Noodles',
      description: 'Bright noodles',
      ingredients: ['noodles', 'lime'],
      instructions: ['Boil noodles', 'Toss with lime'],
      tags: ['dinner'],
      ownerId: 'user-1',
      ownerName: 'Chef',
      createdAt: 100,
    },
  };

  it('shows remix attribution and visible changes', () => {
    render(<RecipeDetail recipe={remixedRecipe} onClose={vi.fn()} />);

    expect(screen.getByText((_, element) => element?.textContent === 'Based on Original Citrus Noodles by Chef')).toBeDefined();
    expect(screen.getByText('Original Citrus Noodles')).toBeDefined();
    expect(screen.getByText('What Changed')).toBeDefined();
    expect(screen.getByText('Added chili crisp')).toBeDefined();
    expect(screen.getByText('Added Toss with lime and chili crisp')).toBeDefined();
    expect(screen.getByText('Removed Toss with lime')).toBeDefined();
  });

  it('offers a remix action in public view', () => {
    const onRemix = vi.fn();
    render(
      <RecipeDetail
        recipe={remixedRecipe}
        onClose={vi.fn()}
        onRemix={onRemix}
        isPublicView
      />
    );

    fireEvent.click(screen.getByText('Make My Version'));
    expect(onRemix).toHaveBeenCalledOnce();
  });

  it('allows saved public recipes to toggle from the detail footer', () => {
    const onSave = vi.fn();
    render(
      <RecipeDetail
        recipe={remixedRecipe}
        onClose={vi.fn()}
        onSave={onSave}
        isSaved
        isPublicView
      />
    );

    fireEvent.click(screen.getByText('Saved'));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('cites the original author for unmodified saved copies', () => {
    render(
      <RecipeDetail
        recipe={{
          ...remixedRecipe,
          title: 'Original Citrus Noodles',
          description: 'Bright noodles',
          ingredients: ['noodles', 'lime'],
          instructions: ['Boil noodles', 'Toss with lime'],
          tags: ['dinner'],
        }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText((_, element) => element?.textContent === 'Saved from Original Citrus Noodles by Chef')).toBeDefined();
    expect(screen.queryByText('What Changed')).toBeNull();
  });
});
