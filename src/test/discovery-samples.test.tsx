import { useEffect, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ClientProvider } from '../client/ClientContext';
import type { IClient } from '../client/types';
import { DiscoveryProvider, useDiscovery } from '../context/DiscoveryContext';
import { SAMPLE_RECIPES } from '../data/sampleRecipes';
import { SAMPLE_COOKBOOKS } from '../data/sampleCookbooks';

function createClientMock() {
  return {
    discover: {
      recipes: vi.fn().mockResolvedValue({ data: { recipes: [], total: 0 } }),
      cookbooks: vi.fn().mockResolvedValue({ data: { cookbooks: [], total: 0 } }),
      getRecipe: vi.fn(),
      getCookbook: vi.fn(),
      saveRecipe: vi.fn(),
      remixRecipe: vi.fn(),
      saveCookbook: vi.fn(),
    },
    recipes: {
      list: vi.fn().mockResolvedValue({ data: { recipes: [] } }),
      create: vi.fn(),
    },
    cookbooks: {
      create: vi.fn(),
      addRecipe: vi.fn(),
    },
  } as unknown as IClient;
}

function DiscoveryProbe() {
  const {
    recipes,
    cookbooks,
    recipesTotal,
    cookbooksTotal,
    loadRecipes,
    loadCookbooks,
    loadMoreRecipes,
    saveRecipe,
  } = useDiscovery();
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    void loadRecipes();
    void loadCookbooks();
  }, [loadRecipes, loadCookbooks]);

  return (
    <div>
      <p>Recipes total: {recipesTotal}</p>
      <p>Cookbooks total: {cookbooksTotal}</p>
      {recipes.map(recipe => (
        <p key={recipe.id}>{recipe.title}</p>
      ))}
      {cookbooks.map(cookbook => (
        <p key={cookbook.id}>{cookbook.name}</p>
      ))}
      <button onClick={() => void loadMoreRecipes()}>More recipes</button>
      <button onClick={() => void saveRecipe(SAMPLE_RECIPES[0].id).then(setSavedRecipeId)}>
        Save sample
      </button>
      {savedRecipeId && <p>Saved recipe: {savedRecipeId}</p>}
    </div>
  );
}

function renderDiscovery(client: IClient) {
  return render(
    <ClientProvider client={client}>
      <DiscoveryProvider>
        <DiscoveryProbe />
      </DiscoveryProvider>
    </ClientProvider>
  );
}

describe('Discovery sample fallback', () => {
  it('shows sample recipes and cookbooks when the discover API returns an empty first page', async () => {
    const client = createClientMock();
    renderDiscovery(client);

    await waitFor(() => {
      expect(screen.getByText(SAMPLE_RECIPES[0].title)).toBeDefined();
      expect(screen.getByText(SAMPLE_COOKBOOKS[0].name)).toBeDefined();
    });

    expect(screen.getByText(`Recipes total: ${SAMPLE_RECIPES.length}`)).toBeDefined();
    expect(screen.getByText(`Cookbooks total: ${SAMPLE_COOKBOOKS.length}`)).toBeDefined();
  });

  it('keeps paginating sample recipes locally after an empty API first page', async () => {
    const client = createClientMock();
    renderDiscovery(client);

    await waitFor(() => {
      expect(screen.getByText(SAMPLE_RECIPES[0].title)).toBeDefined();
    });

    fireEvent.click(screen.getByText('More recipes'));

    await waitFor(() => {
      expect(screen.getByText(SAMPLE_RECIPES[12].title)).toBeDefined();
    });
    expect(client.discover.recipes).toHaveBeenCalledTimes(1);
  });

  it('shows sample recipes and cookbooks after sparse public API content', async () => {
    const client = createClientMock();
    vi.mocked(client.discover.recipes).mockResolvedValue({
      data: {
        recipes: [{
          id: 'public-recipe-1',
          title: 'A Real Public Recipe',
          description: 'From the API',
          ingredients: ['ingredient'],
          instructions: ['step'],
          tags: ['dinner'],
          isPublic: true,
          ownerName: 'Real Chef',
          createdAt: Date.now(),
        }],
        total: 1,
      },
    });
    vi.mocked(client.discover.cookbooks).mockResolvedValue({
      data: {
        cookbooks: [{
          id: 'public-cookbook-1',
          name: 'A Real Public Cookbook',
          recipeCount: 1,
          isPublic: true,
          isOwner: false,
          ownerName: 'Real Chef',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }],
        total: 1,
      },
    });

    renderDiscovery(client);

    await waitFor(() => {
      expect(screen.getByText('A Real Public Recipe')).toBeDefined();
      expect(screen.getByText(SAMPLE_RECIPES[0].title)).toBeDefined();
      expect(screen.getByText('A Real Public Cookbook')).toBeDefined();
      expect(screen.getByText(SAMPLE_COOKBOOKS[0].name)).toBeDefined();
    });

    expect(screen.getByText(`Recipes total: ${SAMPLE_RECIPES.length + 1}`)).toBeDefined();
    expect(screen.getByText(`Cookbooks total: ${SAMPLE_COOKBOOKS.length + 1}`)).toBeDefined();
  });

  it('saves sample recipes through the recipe client', async () => {
    const client = createClientMock();
    vi.mocked(client.recipes.create).mockResolvedValue({ data: { id: 'saved-sample-recipe' } });
    renderDiscovery(client);

    await waitFor(() => {
      expect(screen.getByText(SAMPLE_RECIPES[0].title)).toBeDefined();
    });

    fireEvent.click(screen.getByText('Save sample'));

    await waitFor(() => {
      expect(screen.getByText('Saved recipe: saved-sample-recipe')).toBeDefined();
    });

    expect(client.recipes.list).toHaveBeenCalled();
    expect(client.recipes.create).toHaveBeenCalledWith(expect.objectContaining({
      title: SAMPLE_RECIPES[0].title,
      ingredients: SAMPLE_RECIPES[0].ingredients,
      instructions: SAMPLE_RECIPES[0].instructions,
      isPublic: false,
      sourceRecipeId: SAMPLE_RECIPES[0].id,
      sourceRecipe: expect.objectContaining({
        id: SAMPLE_RECIPES[0].id,
        ownerName: SAMPLE_RECIPES[0].ownerName,
      }),
    }));
  });
});
