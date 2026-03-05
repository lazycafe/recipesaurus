import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecipeCard } from './RecipeCard';
import type { Recipe } from '../types/Recipe';

describe('RecipeCard', () => {
  const mockRecipe: Recipe = {
    id: '1',
    title: 'Test Recipe',
    description: 'A delicious test recipe',
    ingredients: ['ingredient 1', 'ingredient 2'],
    instructions: ['step 1', 'step 2'],
    tags: ['dinner', 'quick'],
    createdAt: Date.now(),
  };

  it('renders recipe title and description', () => {
    render(<RecipeCard recipe={mockRecipe} onClick={() => {}} />);

    expect(screen.getByText('Test Recipe')).toBeDefined();
    expect(screen.getByText('A delicious test recipe')).toBeDefined();
  });

  it('renders tags', () => {
    render(<RecipeCard recipe={mockRecipe} onClick={() => {}} />);

    expect(screen.getByText('dinner')).toBeDefined();
    expect(screen.getByText('quick')).toBeDefined();
  });

  it('truncates tags to 3 and shows +N', () => {
    const recipeWithManyTags = {
      ...mockRecipe,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    };
    render(<RecipeCard recipe={recipeWithManyTags} onClick={() => {}} />);

    expect(screen.getByText('tag1')).toBeDefined();
    expect(screen.getByText('tag2')).toBeDefined();
    expect(screen.getByText('tag3')).toBeDefined();
    expect(screen.getByText('+2')).toBeDefined();
    expect(screen.queryByText('tag4')).toBeNull();
  });

  it('calls onClick when card clicked', () => {
    const onClick = vi.fn();
    render(<RecipeCard recipe={mockRecipe} onClick={onClick} />);

    fireEvent.click(screen.getByText('Test Recipe'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows delete button when onDelete provided', () => {
    render(
      <RecipeCard
        recipe={mockRecipe}
        onClick={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByLabelText('Delete recipe')).toBeDefined();
  });

  it('calls onDelete when delete clicked and confirmed', () => {
    const onDelete = vi.fn();
    render(
      <RecipeCard
        recipe={mockRecipe}
        onClick={() => {}}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByLabelText('Delete recipe'));
    // Confirm modal should appear
    expect(screen.getByText('Delete Recipe')).toBeDefined();
    // Click the confirm button
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('does not call onDelete when cancelled', () => {
    const onDelete = vi.fn();
    render(
      <RecipeCard
        recipe={mockRecipe}
        onClick={() => {}}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByLabelText('Delete recipe'));
    // Confirm modal should appear
    expect(screen.getByText('Delete Recipe')).toBeDefined();
    // Click the cancel button
    fireEvent.click(screen.getByText('Cancel'));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('shows add to cookbook button when onAddToCookbook provided', () => {
    render(
      <RecipeCard
        recipe={mockRecipe}
        onClick={() => {}}
        onAddToCookbook={() => {}}
      />
    );

    expect(screen.getByLabelText('Add to cookbook')).toBeDefined();
  });

  it('calls onAddToCookbook when button clicked', () => {
    const onAddToCookbook = vi.fn();
    const onClick = vi.fn();
    render(
      <RecipeCard
        recipe={mockRecipe}
        onClick={onClick}
        onAddToCookbook={onAddToCookbook}
      />
    );

    fireEvent.click(screen.getByLabelText('Add to cookbook'));
    expect(onAddToCookbook).toHaveBeenCalledOnce();
    // Should not trigger card click
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders image when imageUrl provided', () => {
    const recipeWithImage = {
      ...mockRecipe,
      imageUrl: 'https://example.com/image.jpg',
    };
    render(<RecipeCard recipe={recipeWithImage} onClick={() => {}} />);

    const img = screen.getByAltText('Test Recipe');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/image.jpg');
  });

  it('renders placeholder when no imageUrl', () => {
    const { container } = render(
      <RecipeCard recipe={mockRecipe} onClick={() => {}} />
    );

    expect(container.querySelector('.card-image-placeholder')).toBeDefined();
  });

  it('renders prep time when provided', () => {
    const recipeWithTime = { ...mockRecipe, prepTime: '15 mins' };
    render(<RecipeCard recipe={recipeWithTime} onClick={() => {}} />);

    expect(screen.getByText('15 mins')).toBeDefined();
  });

  it('renders servings when provided', () => {
    const recipeWithServings = { ...mockRecipe, servings: '4' };
    render(<RecipeCard recipe={recipeWithServings} onClick={() => {}} />);

    expect(screen.getByText('4')).toBeDefined();
  });

  it('hides actions when no callbacks provided', () => {
    const { container } = render(
      <RecipeCard recipe={mockRecipe} onClick={() => {}} />
    );

    expect(container.querySelector('.card-actions')).toBeNull();
  });
});
