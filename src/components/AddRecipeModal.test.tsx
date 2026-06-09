import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddRecipeModal } from './AddRecipeModal';
import type { Recipe } from '../types/Recipe';
import * as recipeExtractor from '../utils/recipeExtractor';

describe('AddRecipeModal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults new recipes to public', () => {
    render(<AddRecipeModal onClose={vi.fn()} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Manual/i }));

    expect(screen.getByRole('button', { name: 'Make private' })).toBeDefined();
    expect(screen.getByText('Public')).toBeDefined();
  });

  it('does not treat the public default as an unsaved change', () => {
    const onClose = vi.fn();
    render(<AddRecipeModal onClose={onClose} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByText('Discard Changes')).toBeNull();
  });

  it('preserves private visibility when editing a recipe', () => {
    const recipe: Recipe = {
      id: 'recipe-1',
      title: 'Private Pasta',
      description: '',
      ingredients: ['noodles'],
      instructions: ['boil'],
      tags: [],
      isPublic: false,
      createdAt: Date.now(),
    };

    render(<AddRecipeModal recipe={recipe} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Make public' })).toBeDefined();
    expect(screen.getByText('Private')).toBeDefined();
  });

  it('lets users pick an extracted URL image while keeping manual upload available', async () => {
    const onSubmit = vi.fn();
    vi.spyOn(recipeExtractor, 'fetchAndExtractRecipe').mockResolvedValue({
      title: 'Imported Soup',
      description: 'A cozy bowl',
      ingredients: ['broth', 'noodles'],
      instructions: ['Simmer everything'],
      tags: ['soup', 'dinner'],
      imageUrl: 'https://example.com/hero.jpg',
      images: [
        { url: 'https://example.com/hero.jpg', source: 'recipe' },
        { url: 'https://example.com/noodles.jpg', alt: 'Noodles', source: 'page' },
      ],
      sourceUrl: 'https://example.com/soup',
    });

    render(<AddRecipeModal onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Recipe URL'), {
      target: { value: 'https://example.com/soup' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /Extract Recipe/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Images found on page')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: 'Select image 1' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Upload different image')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Select image 2' }));
    expect(screen.getByRole('button', { name: 'Select image 2' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Imported Soup',
      tags: 'soup, dinner',
      imageUrl: 'https://example.com/noodles.jpg',
    }));
  });

  it('only preselects suggested tags when importing from a URL', async () => {
    const onSubmit = vi.fn();
    vi.spyOn(recipeExtractor, 'fetchAndExtractRecipe').mockResolvedValue({
      title: 'Imported Chicken Bowl',
      description: 'A weeknight bowl',
      ingredients: ['chicken', 'rice', 'avocado'],
      instructions: ['Cook and assemble'],
      tags: ['Chicken', 'Lunch', 'rice', 'healthy', 'avocado', 'Lunch'],
      sourceUrl: 'https://example.com/chicken-bowl',
    });

    render(<AddRecipeModal onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Recipe URL'), {
      target: { value: 'https://example.com/chicken-bowl' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /Extract Recipe/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Imported Chicken Bowl')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      tags: 'lunch, healthy',
    }));
  });
});
