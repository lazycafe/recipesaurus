import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareRecipeModal } from './ShareRecipeModal';
import type { Recipe } from '../types/Recipe';
import { ClientProvider } from '../client/ClientContext';
import type { IClient } from '../client/types';

describe('ShareRecipeModal', () => {
  const mockWriteText = vi.fn();
  const mockCreateShareLink = vi.fn();
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
    mockCreateShareLink.mockResolvedValue({
      data: { token: 'short-share-token', createdAt: 1 },
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
    });
  });

  const client = {
    recipes: {
      createShareLink: mockCreateShareLink,
    },
  } as unknown as IClient;

  it('copies a short public URL for shared recipes', async () => {
    render(
      <ClientProvider client={client}>
        <ShareRecipeModal recipe={recipe} onClose={vi.fn()} />
      </ClientProvider>
    );

    fireEvent.click(screen.getByTitle('Copy link'));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledOnce();
    });

    const copiedUrl = mockWriteText.mock.calls[0][0] as string;
    expect(mockCreateShareLink).toHaveBeenCalledWith({
      title: 'Herb Chicken',
      description: 'A bright weeknight dinner',
      ingredients: ['chicken', 'herbs'],
      instructions: ['Season chicken', 'Bake until done'],
      prepTime: '10 mins',
      cookTime: '25 mins',
      servings: '4',
      imageUrl: undefined,
      sourceUrl: 'https://example.com/recipe',
    });
    expect(copiedUrl).toContain('/shared-recipe/short-share-token');
    expect(copiedUrl).not.toContain('/preview/');
    expect(copiedUrl).not.toContain('/recipe/');
  });
});
