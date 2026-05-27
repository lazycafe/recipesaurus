import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { useClient } from '../client/ClientContext';
import type { Recipe, Cookbook } from '../client/types';
import { SAMPLE_RECIPES } from '../data/sampleRecipes';
import { SAMPLE_COOKBOOKS, COOKBOOK_RECIPES } from '../data/sampleCookbooks';

interface DiscoveryState {
  recipes: Recipe[];
  cookbooks: Cookbook[];
  recipesTotal: number;
  cookbooksTotal: number;
  isLoadingRecipes: boolean;
  isLoadingCookbooks: boolean;
  selectedTags: string[];
}

interface DiscoveryContextType extends DiscoveryState {
  loadRecipes: (options?: { offset?: number; tags?: string[] }) => Promise<void>;
  loadCookbooks: (options?: { offset?: number }) => Promise<void>;
  loadMoreRecipes: () => Promise<void>;
  loadMoreCookbooks: () => Promise<void>;
  setSelectedTags: (tags: string[]) => void;
  saveRecipe: (recipeId: string) => Promise<string | null>;
  getPublicRecipe: (id: string) => Promise<Recipe | null>;
  getPublicCookbook: (id: string) => Promise<{ cookbook: Cookbook; recipes: Recipe[] } | null>;
}

const DiscoveryContext = createContext<DiscoveryContextType | null>(null);

export function useDiscovery() {
  const context = useContext(DiscoveryContext);
  if (!context) {
    throw new Error('useDiscovery must be used within a DiscoveryProvider');
  }
  return context;
}

const PAGE_SIZE = 12;

// Filter sample recipes by tags
function filterSampleRecipes(tags: string[]): Recipe[] {
  if (tags.length === 0) return SAMPLE_RECIPES;
  return SAMPLE_RECIPES.filter(recipe =>
    tags.some(tag => recipe.tags.includes(tag))
  );
}

export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const client = useClient();
  const [state, setState] = useState<DiscoveryState>({
    recipes: [],
    cookbooks: [],
    recipesTotal: 0,
    cookbooksTotal: 0,
    isLoadingRecipes: false,
    isLoadingCookbooks: false,
    selectedTags: [],
  });
  const useSampleData = useRef(false);

  const loadRecipes = useCallback(async (options?: { offset?: number; tags?: string[] }) => {
    setState(s => ({ ...s, isLoadingRecipes: true }));
    const offset = options?.offset || 0;
    const tags = options?.tags ?? state.selectedTags;

    try {
      const result = await client.discover.recipes({
        limit: PAGE_SIZE,
        offset,
        tags,
      });

      if (result.data && result.data.recipes.length > 0) {
        useSampleData.current = false;
        setState(s => ({
          ...s,
          recipes: offset ? [...s.recipes, ...result.data!.recipes] : result.data!.recipes,
          recipesTotal: result.data!.total,
          isLoadingRecipes: false,
        }));
      } else {
        // Use sample data when no real data from API
        useSampleData.current = true;
        const filtered = filterSampleRecipes(tags);
        const paged = filtered.slice(offset, offset + PAGE_SIZE);

        setState(s => ({
          ...s,
          recipes: offset ? [...s.recipes, ...paged] : paged,
          recipesTotal: filtered.length,
          isLoadingRecipes: false,
        }));
      }
    } catch (error) {
      console.error('Failed to load discover recipes:', error);

      // Fallback to sample data on error
      useSampleData.current = true;
      const filtered = filterSampleRecipes(tags);
      const paged = filtered.slice(offset, offset + PAGE_SIZE);

      setState(s => ({
        ...s,
        recipes: offset ? [...s.recipes, ...paged] : paged,
        recipesTotal: filtered.length,
        isLoadingRecipes: false,
      }));
    }
  }, [client, state.selectedTags]);

  const loadCookbooks = useCallback(async (options?: { offset?: number }) => {
    setState(s => ({ ...s, isLoadingCookbooks: true }));
    const offset = options?.offset || 0;

    try {
      const result = await client.discover.cookbooks({
        limit: PAGE_SIZE,
        offset,
      });

      if (result.data && result.data.cookbooks.length > 0) {
        setState(s => ({
          ...s,
          cookbooks: offset ? [...s.cookbooks, ...result.data!.cookbooks] : result.data!.cookbooks,
          cookbooksTotal: result.data!.total,
          isLoadingCookbooks: false,
        }));
      } else {
        // Use sample cookbooks when no real data from API
        const paged = SAMPLE_COOKBOOKS.slice(offset, offset + PAGE_SIZE);

        setState(s => ({
          ...s,
          cookbooks: offset ? [...s.cookbooks, ...paged] : paged,
          cookbooksTotal: SAMPLE_COOKBOOKS.length,
          isLoadingCookbooks: false,
        }));
      }
    } catch (error) {
      console.error('Failed to load discover cookbooks:', error);

      // Fallback to sample cookbooks on error
      const paged = SAMPLE_COOKBOOKS.slice(offset, offset + PAGE_SIZE);

      setState(s => ({
        ...s,
        cookbooks: offset ? [...s.cookbooks, ...paged] : paged,
        cookbooksTotal: SAMPLE_COOKBOOKS.length,
        isLoadingCookbooks: false,
      }));
    }
  }, [client]);

  const loadMoreRecipes = useCallback(async () => {
    await loadRecipes({ offset: state.recipes.length });
  }, [loadRecipes, state.recipes.length]);

  const loadMoreCookbooks = useCallback(async () => {
    await loadCookbooks({ offset: state.cookbooks.length });
  }, [loadCookbooks, state.cookbooks.length]);

  const setSelectedTags = useCallback((tags: string[]) => {
    setState(s => ({ ...s, selectedTags: tags }));
    loadRecipes({ tags });
  }, [loadRecipes]);

  const saveRecipe = useCallback(async (recipeId: string): Promise<string | null> => {
    try {
      const result = await client.discover.saveRecipe(recipeId);
      if (result.data) {
        return result.data.id;
      }
      return null;
    } catch (error) {
      console.error('Failed to save recipe:', error);
      return null;
    }
  }, [client]);

  const getPublicRecipe = useCallback(async (id: string): Promise<Recipe | null> => {
    try {
      const result = await client.discover.getRecipe(id);
      if (result.data?.recipe) {
        return result.data.recipe;
      }

      // Fallback to sample data
      return SAMPLE_RECIPES.find(r => r.id === id) || null;
    } catch (error) {
      console.error('Failed to get public recipe:', error);

      // Fallback to sample data on error
      return SAMPLE_RECIPES.find(r => r.id === id) || null;
    }
  }, [client]);

  const getPublicCookbook = useCallback(async (id: string): Promise<{ cookbook: Cookbook; recipes: Recipe[] } | null> => {
    try {
      const result = await client.discover.getCookbook(id);
      if (result.data) {
        return result.data;
      }

      // Fallback to sample data
      const cookbook = SAMPLE_COOKBOOKS.find(c => c.id === id);
      if (cookbook) {
        const recipeIds = COOKBOOK_RECIPES[id] || [];
        const recipes = recipeIds
          .map(rid => SAMPLE_RECIPES.find(r => r.id === rid))
          .filter((r): r is Recipe => r !== undefined);
        return { cookbook, recipes };
      }

      return null;
    } catch (error) {
      console.error('Failed to get public cookbook:', error);

      // Fallback to sample data on error
      const cookbook = SAMPLE_COOKBOOKS.find(c => c.id === id);
      if (cookbook) {
        const recipeIds = COOKBOOK_RECIPES[id] || [];
        const recipes = recipeIds
          .map(rid => SAMPLE_RECIPES.find(r => r.id === rid))
          .filter((r): r is Recipe => r !== undefined);
        return { cookbook, recipes };
      }

      return null;
    }
  }, [client]);

  return (
    <DiscoveryContext.Provider
      value={{
        ...state,
        loadRecipes,
        loadCookbooks,
        loadMoreRecipes,
        loadMoreCookbooks,
        setSelectedTags,
        saveRecipe,
        getPublicRecipe,
        getPublicCookbook,
      }}
    >
      {children}
    </DiscoveryContext.Provider>
  );
}
