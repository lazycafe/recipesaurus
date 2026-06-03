import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { compressToEncodedURIComponent } from 'lz-string';
import { ClientProvider } from '../client/ClientContext';
import type { IClient } from '../client/types';
import { SharedRecipePreview } from './SharedRecipePreview';

describe('SharedRecipePreview', () => {
  const mockSaveFromPreview = vi.fn();
  const recipe = {
    title: 'Shared Pancakes',
    description: 'Weekend breakfast',
    ingredients: ['1 cup flour', '2 eggs'],
    instructions: ['Mix batter', 'Cook on griddle'],
    prepTime: '10 mins',
    cookTime: '15 mins',
    servings: '4',
    imageUrl: null,
    sourceUrl: 'https://example.com/pancakes',
  };
  const encodedRecipe = compressToEncodedURIComponent(JSON.stringify(recipe));

  const client = {
    recipes: {
      saveFromPreview: mockSaveFromPreview,
    },
  } as unknown as IClient;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockSaveFromPreview.mockResolvedValue({ data: { id: 'recipe-1', collectionId: 'collection-1' } });
  });

  it('links the shared recipe header icon to the home page', async () => {
    render(
      <ClientProvider client={client}>
        <SharedRecipePreview encodedData={encodedRecipe} isLoggedIn={false} />
      </ClientProvider>
    );

    await screen.findByRole('heading', { name: 'Shared Pancakes' });
    expect(screen.getByRole('link', { name: /recipesaurus home/i }).getAttribute('href')).toBe('/');
  });

  it('saves the recipe when the public viewer is logged in', async () => {
    render(
      <ClientProvider client={client}>
        <SharedRecipePreview encodedData={encodedRecipe} isLoggedIn />
      </ClientProvider>
    );

    await screen.findByRole('heading', { name: 'Shared Pancakes' });
    fireEvent.click(screen.getByRole('button', { name: /save to recipesaurus/i }));

    await waitFor(() => {
      expect(mockSaveFromPreview).toHaveBeenCalledWith({
        title: 'Shared Pancakes',
        description: 'Weekend breakfast',
        ingredients: ['1 cup flour', '2 eggs'],
        instructions: ['Mix batter', 'Cook on griddle'],
        prepTime: '10 mins',
        cookTime: '15 mins',
        servings: '4',
        imageUrl: undefined,
        sourceUrl: 'https://example.com/pancakes',
      });
    });
    expect(await screen.findByRole('button', { name: /saved/i })).toBeDefined();
  });

  it('opens Get Started instead of saving when the viewer is logged out', async () => {
    const onSignUp = vi.fn();

    render(
      <ClientProvider client={client}>
        <SharedRecipePreview encodedData={encodedRecipe} isLoggedIn={false} onSignUp={onSignUp} />
      </ClientProvider>
    );

    await screen.findByRole('heading', { name: 'Shared Pancakes' });
    fireEvent.click(screen.getByRole('button', { name: /save to recipesaurus/i }));

    expect(onSignUp).toHaveBeenCalledOnce();
    expect(mockSaveFromPreview).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('pendingSaveRecipe')).toContain('Shared Pancakes');
  });

  it('waits for auth before choosing save or Get Started', async () => {
    const onSignUp = vi.fn();

    render(
      <ClientProvider client={client}>
        <SharedRecipePreview
          encodedData={encodedRecipe}
          isLoggedIn={false}
          isAuthLoading
          onSignUp={onSignUp}
        />
      </ClientProvider>
    );

    await screen.findByRole('heading', { name: 'Shared Pancakes' });
    const saveButton = screen.getByRole('button', { name: /save to recipesaurus/i });

    expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(saveButton);

    expect(onSignUp).not.toHaveBeenCalled();
    expect(mockSaveFromPreview).not.toHaveBeenCalled();
  });
});
