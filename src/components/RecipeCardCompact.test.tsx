import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecipeCardCompact } from './RecipeCardCompact';
import type { Recipe } from '../client/types';

describe('RecipeCardCompact', () => {
  const mockRecipe: Recipe = {
    id: 'recipe-1',
    title: 'Test Recipe',
    description: 'A test recipe description',
    ingredients: ['ingredient 1', 'ingredient 2'],
    instructions: ['step 1', 'step 2'],
    tags: ['test', 'recipe'],
    prepTime: '15 mins',
    cookTime: '30 mins',
    servings: '4',
    createdAt: Date.now(),
  };

  const mockRecipeWithImage: Recipe = {
    ...mockRecipe,
    imageUrl: 'https://example.com/image.jpg',
  };

  it('renders recipe title', () => {
    render(
      <RecipeCardCompact
        recipe={mockRecipe}
        onClick={() => {}}
      />
    );

    expect(screen.getByText('Test Recipe')).toBeDefined();
  });

  it('renders prep time', () => {
    render(
      <RecipeCardCompact
        recipe={mockRecipe}
        onClick={() => {}}
      />
    );

    expect(screen.getByText('15 mins')).toBeDefined();
  });

  it('renders image when provided', () => {
    render(
      <RecipeCardCompact
        recipe={mockRecipeWithImage}
        onClick={() => {}}
      />
    );

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/image.jpg');
    expect(img.getAttribute('alt')).toBe('Test Recipe');
  });

  it('renders placeholder when no image', () => {
    const { container } = render(
      <RecipeCardCompact
        recipe={mockRecipe}
        onClick={() => {}}
      />
    );

    const placeholder = container.querySelector('.compact-card-placeholder');
    expect(placeholder).toBeDefined();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();
    render(
      <RecipeCardCompact
        recipe={mockRecipe}
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByText('Test Recipe').closest('article')!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders add to cookbook button when handler provided', () => {
    render(
      <RecipeCardCompact
        recipe={mockRecipe}
        onClick={() => {}}
        onAddToCookbook={() => {}}
        showActions={true}
      />
    );

    expect(screen.getByLabelText('Add to cookbook')).toBeDefined();
  });

  it('renders delete button when handler provided', () => {
    render(
      <RecipeCardCompact
        recipe={mockRecipe}
        onClick={() => {}}
        onDelete={() => {}}
        showActions={true}
      />
    );

    expect(screen.getByLabelText('Delete')).toBeDefined();
  });

  it('calls onAddToCookbook when add button clicked', () => {
    const onAddToCookbook = vi.fn();
    const onClick = vi.fn();

    render(
      <RecipeCardCompact
        recipe={mockRecipe}
        onClick={onClick}
        onAddToCookbook={onAddToCookbook}
        showActions={true}
      />
    );

    fireEvent.click(screen.getByLabelText('Add to cookbook'));
    expect(onAddToCookbook).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled(); // Should stop propagation
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    const onClick = vi.fn();

    render(
      <RecipeCardCompact
        recipe={mockRecipe}
        onClick={onClick}
        onDelete={onDelete}
        showActions={true}
      />
    );

    fireEvent.click(screen.getByLabelText('Delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('hides actions when showActions is false', () => {
    render(
      <RecipeCardCompact
        recipe={mockRecipe}
        onClick={() => {}}
        onAddToCookbook={() => {}}
        onDelete={() => {}}
        showActions={false}
      />
    );

    expect(screen.queryByLabelText('Add to cookbook')).toBeNull();
    expect(screen.queryByLabelText('Delete')).toBeNull();
  });

  it('does not render prep time when not provided', () => {
    const recipeWithoutPrepTime: Recipe = {
      ...mockRecipe,
      prepTime: undefined,
    };

    render(
      <RecipeCardCompact
        recipe={recipeWithoutPrepTime}
        onClick={() => {}}
      />
    );

    expect(screen.queryByText('15 mins')).toBeNull();
  });

  it('has correct CSS classes', () => {
    const { container } = render(
      <RecipeCardCompact
        recipe={mockRecipe}
        onClick={() => {}}
      />
    );

    expect(container.querySelector('.recipe-card-compact')).toBeDefined();
    expect(container.querySelector('.compact-card-image')).toBeDefined();
    expect(container.querySelector('.compact-card-body')).toBeDefined();
    expect(container.querySelector('.compact-card-title')).toBeDefined();
  });
});
