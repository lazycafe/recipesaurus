import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { useClient } from '../client/ClientContext';
import type { Recipe, Cookbook } from '../client/types';
import { SAMPLE_RECIPES } from '../data/sampleRecipes';
import { SAMPLE_COOKBOOKS, COOKBOOK_RECIPES } from '../data/sampleCookbooks';
import { findDuplicateRecipe } from '../utils/recipeDedupe';
import { buildSourceSnapshot } from '../utils/recipeRemix';

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
  remixRecipe: (recipeId: string) => Promise<string | null>;
  saveCookbook: (cookbookId: string) => Promise<string | null>;
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

function mergeUniqueById<T extends { id: string }>(current: T[], next: T[]): T[] {
  const seen = new Set(current.map(item => item.id));
  const uniqueNext = next.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return [...current, ...uniqueNext];
}

function shouldUseSampleFallback<T>(items: T[], total: number, offset: number): boolean {
  return offset === 0 && items.length === 0 && total === 0;
}

function combineWithSamplePage<T extends { id: string }>(
  publicItems: T[],
  publicTotal: number,
  sampleItems: T[],
  offset: number
): T[] {
  const sampleStart = Math.max(0, offset + publicItems.length - publicTotal);
  const sampleNeeded = Math.max(0, PAGE_SIZE - publicItems.length);
  return mergeUniqueById(publicItems, sampleItems.slice(sampleStart, sampleStart + sampleNeeded));
}

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
  const useSampleRecipes = useRef(false);
  const useSampleCookbooks = useRef(false);

  const loadRecipes = useCallback(async (options?: { offset?: number; tags?: string[] }) => {
    setState(s => ({ ...s, isLoadingRecipes: true }));
    const offset = options?.offset || 0;
    const tags = options?.tags ?? state.selectedTags;

    if (offset > 0 && useSampleRecipes.current) {
      const filtered = filterSampleRecipes(tags);
      const paged = filtered.slice(offset, offset + PAGE_SIZE);

      setState(s => ({
        ...s,
        recipes: mergeUniqueById(s.recipes, paged),
        recipesTotal: filtered.length,
        isLoadingRecipes: false,
      }));
      return;
    }

    try {
      const result = await client.discover.recipes({
        limit: PAGE_SIZE,
        offset,
        tags,
      });

      if (
        result.data &&
        !shouldUseSampleFallback(result.data.recipes, result.data.total, offset)
      ) {
        useSampleRecipes.current = false;
        const filteredSamples = filterSampleRecipes(tags);
        const combinedPage = combineWithSamplePage(
          result.data.recipes,
          result.data.total,
          filteredSamples,
          offset
        );

        setState(s => ({
          ...s,
          recipes: offset ? mergeUniqueById(s.recipes, combinedPage) : combinedPage,
          recipesTotal: result.data!.total + filteredSamples.length,
          isLoadingRecipes: false,
        }));
      } else {
        // Use sample data when no real data from API
        useSampleRecipes.current = true;
        const filtered = filterSampleRecipes(tags);
        const paged = filtered.slice(offset, offset + PAGE_SIZE);

        setState(s => ({
          ...s,
          recipes: offset ? mergeUniqueById(s.recipes, paged) : mergeUniqueById([], paged),
          recipesTotal: filtered.length,
          isLoadingRecipes: false,
        }));
      }
    } catch (error) {
      console.error('Failed to load discover recipes:', error);

      // Fallback to sample data on error
      useSampleRecipes.current = true;
      const filtered = filterSampleRecipes(tags);
      const paged = filtered.slice(offset, offset + PAGE_SIZE);

      setState(s => ({
        ...s,
        recipes: offset ? mergeUniqueById(s.recipes, paged) : mergeUniqueById([], paged),
        recipesTotal: filtered.length,
        isLoadingRecipes: false,
      }));
    }
  }, [client, state.selectedTags]);

  const loadCookbooks = useCallback(async (options?: { offset?: number }) => {
    setState(s => ({ ...s, isLoadingCookbooks: true }));
    const offset = options?.offset || 0;

    if (offset > 0 && useSampleCookbooks.current) {
      const paged = SAMPLE_COOKBOOKS.slice(offset, offset + PAGE_SIZE);

      setState(s => ({
        ...s,
        cookbooks: mergeUniqueById(s.cookbooks, paged),
        cookbooksTotal: SAMPLE_COOKBOOKS.length,
        isLoadingCookbooks: false,
      }));
      return;
    }

    try {
      const result = await client.discover.cookbooks({
        limit: PAGE_SIZE,
        offset,
      });

      if (
        result.data &&
        !shouldUseSampleFallback(result.data.cookbooks, result.data.total, offset)
      ) {
        useSampleCookbooks.current = false;
        const combinedPage = combineWithSamplePage(
          result.data.cookbooks,
          result.data.total,
          SAMPLE_COOKBOOKS,
          offset
        );

        setState(s => ({
          ...s,
          cookbooks: offset ? mergeUniqueById(s.cookbooks, combinedPage) : combinedPage,
          cookbooksTotal: result.data!.total + SAMPLE_COOKBOOKS.length,
          isLoadingCookbooks: false,
        }));
      } else {
        // Use sample cookbooks when no real data from API
        useSampleCookbooks.current = true;
        const paged = SAMPLE_COOKBOOKS.slice(offset, offset + PAGE_SIZE);

        setState(s => ({
          ...s,
          cookbooks: offset ? mergeUniqueById(s.cookbooks, paged) : mergeUniqueById([], paged),
          cookbooksTotal: SAMPLE_COOKBOOKS.length,
          isLoadingCookbooks: false,
        }));
      }
    } catch (error) {
      console.error('Failed to load discover cookbooks:', error);

      // Fallback to sample cookbooks on error
      useSampleCookbooks.current = true;
      const paged = SAMPLE_COOKBOOKS.slice(offset, offset + PAGE_SIZE);

      setState(s => ({
        ...s,
        cookbooks: offset ? mergeUniqueById(s.cookbooks, paged) : mergeUniqueById([], paged),
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
      // Check if this is a sample recipe (not in database)
      if (recipeId.startsWith('sample-')) {
        const sampleRecipe = SAMPLE_RECIPES.find(r => r.id === recipeId);
        if (sampleRecipe) {
          const existingRecipes = await client.recipes.list();
          const existingRecipe = findDuplicateRecipe(existingRecipes.data?.recipes || [], sampleRecipe);

          if (existingRecipe) {
            return existingRecipe.id;
          }

          // Create recipe directly from sample data
          const result = await client.recipes.create({
            title: sampleRecipe.title,
            description: sampleRecipe.description,
            ingredients: sampleRecipe.ingredients,
            instructions: sampleRecipe.instructions,
            tags: sampleRecipe.tags,
            imageUrl: sampleRecipe.imageUrl ?? undefined,
            prepTime: sampleRecipe.prepTime ?? undefined,
            cookTime: sampleRecipe.cookTime ?? undefined,
            servings: sampleRecipe.servings ?? undefined,
            isPublic: false,
            sourceRecipeId: sampleRecipe.id,
            sourceRecipe: buildSourceSnapshot(sampleRecipe),
          });
          if (result.data) {
            return result.data.id;
          }
        }
        return null;
      }

      // For real public recipes, use the save endpoint
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

  const remixRecipe = useCallback(async (recipeId: string): Promise<string | null> => {
    try {
      if (recipeId.startsWith('sample-')) {
        const sampleRecipe = SAMPLE_RECIPES.find(r => r.id === recipeId);
        if (!sampleRecipe) return null;

        const result = await client.recipes.create({
          title: sampleRecipe.title,
          description: sampleRecipe.description,
          ingredients: sampleRecipe.ingredients,
          instructions: sampleRecipe.instructions,
          tags: sampleRecipe.tags,
          imageUrl: sampleRecipe.imageUrl ?? undefined,
          prepTime: sampleRecipe.prepTime ?? undefined,
          cookTime: sampleRecipe.cookTime ?? undefined,
          servings: sampleRecipe.servings ?? undefined,
          isPublic: false,
          sourceRecipeId: sampleRecipe.id,
          sourceRecipe: buildSourceSnapshot(sampleRecipe),
        });

        return result.data?.id || null;
      }

      const result = await client.discover.remixRecipe(recipeId);
      return result.data?.id || null;
    } catch (error) {
      console.error('Failed to remix recipe:', error);
      return null;
    }
  }, [client]);

  const saveCookbook = useCallback(async (cookbookId: string): Promise<string | null> => {
    try {
      // Check if this is a sample cookbook (not in database)
      if (cookbookId.startsWith('cookbook-')) {
        const sampleCookbook = SAMPLE_COOKBOOKS.find(c => c.id === cookbookId);
        if (sampleCookbook) {
          // Create cookbook
          const cookbookResult = await client.cookbooks.create({
            name: sampleCookbook.name,
            description: sampleCookbook.description || undefined,
            coverImage: sampleCookbook.coverImage || undefined,
            isPublic: false,
          });

          if (!cookbookResult.data) {
            return null;
          }

          const newCookbookId = cookbookResult.data.id;

          // Get recipe IDs for this cookbook and create each recipe
          const recipeIds = COOKBOOK_RECIPES[cookbookId] || [];
          for (const recipeId of recipeIds) {
            const sampleRecipe = SAMPLE_RECIPES.find(r => r.id === recipeId);
            if (sampleRecipe) {
              const existingRecipes = await client.recipes.list();
              const existingRecipe = findDuplicateRecipe(existingRecipes.data?.recipes || [], sampleRecipe);
              const existingRecipeId = existingRecipe?.id;

              const recipeResult = existingRecipeId
                ? null
                : await client.recipes.create({
                    title: sampleRecipe.title,
                    description: sampleRecipe.description,
                    ingredients: sampleRecipe.ingredients,
                    instructions: sampleRecipe.instructions,
                    tags: sampleRecipe.tags,
                    imageUrl: sampleRecipe.imageUrl ?? undefined,
                    prepTime: sampleRecipe.prepTime ?? undefined,
                    cookTime: sampleRecipe.cookTime ?? undefined,
                    servings: sampleRecipe.servings ?? undefined,
                    isPublic: false,
                    sourceRecipeId: sampleRecipe.id,
                    sourceRecipe: buildSourceSnapshot(sampleRecipe),
                  });

              // Add to cookbook
              const savedRecipeId = existingRecipeId || recipeResult?.data?.id;
              if (savedRecipeId) {
                await client.cookbooks.addRecipe(newCookbookId, savedRecipeId);
              }
            }
          }

          return newCookbookId;
        }
        return null;
      }

      // For real public cookbooks, use the save endpoint
      const result = await client.discover.saveCookbook(cookbookId);
      if (result.data) {
        return result.data.id;
      }
      return null;
    } catch (error) {
      console.error('Failed to save cookbook:', error);
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
        remixRecipe,
        saveCookbook,
        getPublicRecipe,
        getPublicCookbook,
      }}
    >
      {children}
    </DiscoveryContext.Provider>
  );
}
