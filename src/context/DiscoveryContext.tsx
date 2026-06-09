import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { useClient } from '../client/ClientContext';
import type { Recipe, Cookbook } from '../client/types';
import { SAMPLE_RECIPES } from '../data/sampleRecipes';
import { SAMPLE_COOKBOOKS, COOKBOOK_RECIPES } from '../data/sampleCookbooks';
import { findDuplicateRecipe } from '../utils/recipeDedupe';

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
  loadRecipes: (options?: { offset?: number; tags?: string[]; query?: string }) => Promise<void>;
  loadCookbooks: (options?: { offset?: number; query?: string }) => Promise<void>;
  loadMoreRecipes: (options?: { query?: string }) => Promise<void>;
  loadMoreCookbooks: (options?: { query?: string }) => Promise<void>;
  setSelectedTags: (tags: string[]) => void;
  saveRecipe: (recipeId: string) => Promise<string | null>;
  saveCookbook: (cookbookId: string) => Promise<string | null>;
  unsaveRecipe: (recipeId: string) => Promise<boolean>;
  unsaveCookbook: (cookbookId: string) => Promise<boolean>;
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

function markItemSaved<T extends { id: string }>(items: T[], itemId: string, savedCopyId: string): T[] {
  return items.map(item =>
    item.id === itemId ? { ...item, isSaved: true, savedCopyId } : item
  );
}

function markItemUnsaved<T extends { id: string }>(items: T[], itemId: string): T[] {
  return items.map(item =>
    item.id === itemId ? { ...item, isSaved: false, savedCopyId: null } : item
  );
}

// Filter sample recipes by tags
function matchesQuery(item: { title?: string; name?: string; description?: string | null; tags?: string[] }, query: string): boolean {
  if (!query) return true;
  const normalized = query.toLowerCase();
  return (
    item.title?.toLowerCase().includes(normalized) ||
    item.name?.toLowerCase().includes(normalized) ||
    item.description?.toLowerCase().includes(normalized) ||
    item.tags?.some(tag => tag.toLowerCase().includes(normalized)) ||
    false
  );
}

function filterSampleRecipes(tags: string[], query = ''): Recipe[] {
  return SAMPLE_RECIPES.filter(recipe =>
    (tags.length === 0 || tags.some(tag => recipe.tags.includes(tag))) &&
    matchesQuery(recipe, query)
  );
}

function filterSampleCookbooks(query = ''): Cookbook[] {
  return SAMPLE_COOKBOOKS.filter(cookbook => matchesQuery(cookbook, query));
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

  const annotateSampleRecipes = useCallback(async (items: Recipe[]): Promise<Recipe[]> => {
    if (!items.some(item => item.id.startsWith('sample-'))) {
      return items;
    }

    const existingRecipes = await client.recipes.list();
    const existing = existingRecipes.data?.recipes || [];
    return items.map(item => {
      if (!item.id.startsWith('sample-')) return item;
      const duplicate = findDuplicateRecipe(existing, item);
      return {
        ...item,
        isSaved: Boolean(duplicate),
        savedCopyId: duplicate?.id || null,
      };
    });
  }, [client]);

  const annotateSampleCookbooks = useCallback(async (items: Cookbook[]): Promise<Cookbook[]> => {
    if (!items.some(item => item.id.startsWith('cookbook-'))) {
      return items;
    }

    const existingCookbooks = await client.cookbooks.list();
    const owned = existingCookbooks.data?.owned || [];
    return items.map(item => {
      if (!item.id.startsWith('cookbook-')) return item;
      const duplicate = owned.find(cookbook =>
        !cookbook.isSystem &&
        cookbook.name === item.name &&
        (cookbook.description || '') === (item.description || '') &&
        (cookbook.coverImage || '') === (item.coverImage || '') &&
        cookbook.recipeCount === item.recipeCount
      );

      return {
        ...item,
        isSaved: Boolean(duplicate),
        savedCopyId: duplicate?.id || null,
      };
    });
  }, [client]);

  const loadRecipes = useCallback(async (options?: { offset?: number; tags?: string[]; query?: string }) => {
    setState(s => ({ ...s, isLoadingRecipes: true }));
    const offset = options?.offset || 0;
    const tags = options?.tags ?? state.selectedTags;
    const query = options?.query?.trim() || '';

    if (offset > 0 && useSampleRecipes.current) {
      const filtered = filterSampleRecipes(tags, query);
      const paged = filtered.slice(offset, offset + PAGE_SIZE);
      const annotated = await annotateSampleRecipes(paged);

      setState(s => ({
        ...s,
        recipes: mergeUniqueById(s.recipes, annotated),
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
        query,
      });

      if (
        result.data &&
        !shouldUseSampleFallback(result.data.recipes, result.data.total, offset)
      ) {
        useSampleRecipes.current = false;
        const filteredSamples = filterSampleRecipes(tags, query);
        const combinedPage = combineWithSamplePage(
          result.data.recipes,
          result.data.total,
          filteredSamples,
          offset
        );
        const annotated = await annotateSampleRecipes(combinedPage);

        setState(s => ({
          ...s,
          recipes: offset ? mergeUniqueById(s.recipes, annotated) : annotated,
          recipesTotal: result.data!.total + filteredSamples.length,
          isLoadingRecipes: false,
        }));
      } else {
        // Use sample data when no real data from API
        useSampleRecipes.current = true;
        const filtered = filterSampleRecipes(tags, query);
        const paged = filtered.slice(offset, offset + PAGE_SIZE);
        const annotated = await annotateSampleRecipes(paged);

        setState(s => ({
          ...s,
          recipes: offset ? mergeUniqueById(s.recipes, annotated) : mergeUniqueById([], annotated),
          recipesTotal: filtered.length,
          isLoadingRecipes: false,
        }));
      }
    } catch (error) {
      console.error('Failed to load discover recipes:', error);

      // Fallback to sample data on error
      useSampleRecipes.current = true;
      const filtered = filterSampleRecipes(tags, query);
      const paged = filtered.slice(offset, offset + PAGE_SIZE);
      const annotated = await annotateSampleRecipes(paged);

      setState(s => ({
        ...s,
        recipes: offset ? mergeUniqueById(s.recipes, annotated) : mergeUniqueById([], annotated),
        recipesTotal: filtered.length,
        isLoadingRecipes: false,
      }));
    }
  }, [client, state.selectedTags, annotateSampleRecipes]);

  const loadCookbooks = useCallback(async (options?: { offset?: number; query?: string }) => {
    setState(s => ({ ...s, isLoadingCookbooks: true }));
    const offset = options?.offset || 0;
    const query = options?.query?.trim() || '';

    if (offset > 0 && useSampleCookbooks.current) {
      const filtered = filterSampleCookbooks(query);
      const paged = filtered.slice(offset, offset + PAGE_SIZE);
      const annotated = await annotateSampleCookbooks(paged);

      setState(s => ({
        ...s,
        cookbooks: mergeUniqueById(s.cookbooks, annotated),
        cookbooksTotal: filtered.length,
        isLoadingCookbooks: false,
      }));
      return;
    }

    try {
      const result = await client.discover.cookbooks({
        limit: PAGE_SIZE,
        offset,
        query,
      });

      if (
        result.data &&
        !shouldUseSampleFallback(result.data.cookbooks, result.data.total, offset)
      ) {
        useSampleCookbooks.current = false;
        const filteredSamples = filterSampleCookbooks(query);
        const combinedPage = combineWithSamplePage(
          result.data.cookbooks,
          result.data.total,
          filteredSamples,
          offset
        );
        const annotated = await annotateSampleCookbooks(combinedPage);

        setState(s => ({
          ...s,
          cookbooks: offset ? mergeUniqueById(s.cookbooks, annotated) : annotated,
          cookbooksTotal: result.data!.total + filteredSamples.length,
          isLoadingCookbooks: false,
        }));
      } else {
        // Use sample cookbooks when no real data from API
        useSampleCookbooks.current = true;
        const filtered = filterSampleCookbooks(query);
        const paged = filtered.slice(offset, offset + PAGE_SIZE);
        const annotated = await annotateSampleCookbooks(paged);

        setState(s => ({
          ...s,
          cookbooks: offset ? mergeUniqueById(s.cookbooks, annotated) : mergeUniqueById([], annotated),
          cookbooksTotal: filtered.length,
          isLoadingCookbooks: false,
        }));
      }
    } catch (error) {
      console.error('Failed to load discover cookbooks:', error);

      // Fallback to sample cookbooks on error
      useSampleCookbooks.current = true;
      const filtered = filterSampleCookbooks(query);
      const paged = filtered.slice(offset, offset + PAGE_SIZE);
      const annotated = await annotateSampleCookbooks(paged);

      setState(s => ({
        ...s,
        cookbooks: offset ? mergeUniqueById(s.cookbooks, annotated) : mergeUniqueById([], annotated),
        cookbooksTotal: filtered.length,
        isLoadingCookbooks: false,
      }));
    }
  }, [client, annotateSampleCookbooks]);

  const loadMoreRecipes = useCallback(async (options?: { query?: string }) => {
    await loadRecipes({ offset: state.recipes.length, query: options?.query });
  }, [loadRecipes, state.recipes.length]);

  const loadMoreCookbooks = useCallback(async (options?: { query?: string }) => {
    await loadCookbooks({ offset: state.cookbooks.length, query: options?.query });
  }, [loadCookbooks, state.cookbooks.length]);

  const setSelectedTags = useCallback((tags: string[]) => {
    setState(s => ({ ...s, selectedTags: tags }));
  }, []);

  const saveRecipe = useCallback(async (recipeId: string): Promise<string | null> => {
    try {
      // Check if this is a sample recipe (not in database)
      if (recipeId.startsWith('sample-')) {
        const sampleRecipe = SAMPLE_RECIPES.find(r => r.id === recipeId);
        if (sampleRecipe) {
          const existingRecipes = await client.recipes.list();
          const existingRecipe = findDuplicateRecipe(existingRecipes.data?.recipes || [], sampleRecipe);

          if (existingRecipe) {
            setState(s => ({
              ...s,
              recipes: markItemSaved(s.recipes, recipeId, existingRecipe.id),
            }));
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
          });
          if (result.data) {
            setState(s => ({
              ...s,
              recipes: markItemSaved(s.recipes, recipeId, result.data!.id),
            }));
            return result.data.id;
          }
        }
        return null;
      }

      // For real public recipes, use the save endpoint
      const result = await client.discover.saveRecipe(recipeId);
      if (result.data) {
        setState(s => ({
          ...s,
          recipes: markItemSaved(s.recipes, recipeId, result.data!.id),
        }));
        return result.data.id;
      }
      return null;
    } catch (error) {
      console.error('Failed to save recipe:', error);
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
          const existingRecipes = await client.recipes.list();
          const existing = existingRecipes.data?.recipes || [];
          for (const recipeId of recipeIds) {
            const sampleRecipe = SAMPLE_RECIPES.find(r => r.id === recipeId);
            if (sampleRecipe) {
              const existingRecipe = findDuplicateRecipe(existing, sampleRecipe);
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
                  });

              // Add to cookbook
              const savedRecipeId = existingRecipeId || recipeResult?.data?.id;
              if (savedRecipeId) {
                await client.cookbooks.addRecipe(newCookbookId, savedRecipeId);
                if (!existingRecipeId && recipeResult?.data?.id) {
                  existing.push({
                    ...sampleRecipe,
                    id: recipeResult.data.id,
                    createdAt: Date.now(),
                  });
                }
              }
            }
          }

          setState(s => ({
            ...s,
            cookbooks: markItemSaved(s.cookbooks, cookbookId, newCookbookId),
          }));
          return newCookbookId;
        }
        return null;
      }

      // For real public cookbooks, use the save endpoint
      const result = await client.discover.saveCookbook(cookbookId);
      if (result.data) {
        setState(s => ({
          ...s,
          cookbooks: markItemSaved(s.cookbooks, cookbookId, result.data!.id),
        }));
        return result.data.id;
      }
      return null;
    } catch (error) {
      console.error('Failed to save cookbook:', error);
      return null;
    }
  }, [client]);

  const unsaveRecipe = useCallback(async (recipeId: string): Promise<boolean> => {
    try {
      if (recipeId.startsWith('sample-')) {
        const sampleRecipe = SAMPLE_RECIPES.find(r => r.id === recipeId);
        if (!sampleRecipe) return false;

        const existingRecipes = await client.recipes.list();
        const existingRecipe = findDuplicateRecipe(existingRecipes.data?.recipes || [], sampleRecipe);
        if (existingRecipe) {
          await client.recipes.delete(existingRecipe.id);
        }

        setState(s => ({
          ...s,
          recipes: markItemUnsaved(s.recipes, recipeId),
        }));
        return true;
      }

      const result = await client.discover.unsaveRecipe(recipeId);
      if (result.error) {
        return false;
      }

      setState(s => ({
        ...s,
        recipes: markItemUnsaved(s.recipes, recipeId),
      }));
      return true;
    } catch (error) {
      console.error('Failed to unsave recipe:', error);
      return false;
    }
  }, [client]);

  const unsaveCookbook = useCallback(async (cookbookId: string): Promise<boolean> => {
    try {
      if (cookbookId.startsWith('cookbook-')) {
        const savedCopyId = state.cookbooks.find(cookbook => cookbook.id === cookbookId)?.savedCopyId;
        if (savedCopyId) {
          await client.cookbooks.delete(savedCopyId);
        }

        setState(s => ({
          ...s,
          cookbooks: markItemUnsaved(s.cookbooks, cookbookId),
        }));
        return true;
      }

      const result = await client.discover.unsaveCookbook(cookbookId);
      if (result.error) {
        return false;
      }

      setState(s => ({
        ...s,
        cookbooks: markItemUnsaved(s.cookbooks, cookbookId),
      }));
      return true;
    } catch (error) {
      console.error('Failed to unsave cookbook:', error);
      return false;
    }
  }, [client, state.cookbooks]);

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
        saveCookbook,
        unsaveRecipe,
        unsaveCookbook,
        getPublicRecipe,
        getPublicCookbook,
      }}
    >
      {children}
    </DiscoveryContext.Provider>
  );
}
