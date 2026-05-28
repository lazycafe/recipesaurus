import { useEffect } from 'react';
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
      saveCookbook: vi.fn(),
    },
    recipes: {
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
  } = useDiscovery();

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
});
