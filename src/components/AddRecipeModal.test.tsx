import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddRecipeModal } from './AddRecipeModal';
import type { Recipe } from '../types/Recipe';

describe('AddRecipeModal', () => {
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
});
