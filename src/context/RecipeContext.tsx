import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Recipe } from '../types/Recipe';
import { useClient } from '../client/ClientContext';
import { useAuth } from './AuthContext';
import type { Recipe as ClientRecipe } from '../client/types';

interface RecipeContextType {
  recipes: Recipe[];
  isLoading: boolean;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => Promise<void>;
  updateRecipe: (id: string, recipe: Partial<Omit<Recipe, 'id' | 'createdAt'>>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  getAllTags: () => string[];
  refreshRecipes: () => Promise<void>;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

interface ExtendedRecipe extends Recipe {
  ownerName?: string;
  isOwner?: boolean;
}

function mapRecipeResponse(r: ClientRecipe): ExtendedRecipe {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    ingredients: r.ingredients,
    instructions: r.instructions,
    tags: r.tags,
    imageUrl: r.imageUrl || undefined,
    sourceUrl: r.sourceUrl || undefined,
    prepTime: r.prepTime || undefined,
    cookTime: r.cookTime || undefined,
    servings: r.servings || undefined,
    createdAt: r.createdAt,
    ownerName: r.ownerName || undefined,
    isOwner: r.isOwner,
  };
}

export function RecipeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const client = useClient();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRecipes = useCallback(async () => {
    if (!user) {
      setRecipes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await client.recipes.list();
      if (data?.recipes) {
        setRecipes(data.recipes.map(mapRecipeResponse));
      } else if (error) {
        console.error('Failed to fetch recipes:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, client]);

  useEffect(() => {
    refreshRecipes();
  }, [refreshRecipes]);

  const addRecipe = async (recipeData: Omit<Recipe, 'id' | 'createdAt'>) => {
    const { data, error } = await client.recipes.create({
      title: recipeData.title,
      description: recipeData.description,
      ingredients: recipeData.ingredients,
      instructions: recipeData.instructions,
      tags: recipeData.tags,
      imageUrl: recipeData.imageUrl,
      sourceUrl: recipeData.sourceUrl,
      prepTime: recipeData.prepTime,
      cookTime: recipeData.cookTime,
      servings: recipeData.servings,
      isPublic: recipeData.isPublic,
    });

    if (data?.id) {
      // Add to local state optimistically
      const newRecipe: Recipe = {
        ...recipeData,
        id: data.id,
        createdAt: Date.now(),
      };
      setRecipes(prev => [newRecipe, ...prev]);
    } else if (error) {
      console.error('Failed to create recipe:', error);
      throw new Error(error);
    }
  };

  const updateRecipe = async (id: string, recipeData: Partial<Omit<Recipe, 'id' | 'createdAt'>>) => {
    // Optimistic update
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...recipeData } : r));

    const { error } = await client.recipes.update(id, {
      title: recipeData.title,
      description: recipeData.description,
      ingredients: recipeData.ingredients,
      instructions: recipeData.instructions,
      tags: recipeData.tags,
      imageUrl: recipeData.imageUrl,
      sourceUrl: recipeData.sourceUrl,
      prepTime: recipeData.prepTime,
      cookTime: recipeData.cookTime,
      servings: recipeData.servings,
    });

    if (error) {
      console.error('Failed to update recipe:', error);
      await refreshRecipes();
      throw new Error(error);
    }
  };

  const deleteRecipe = async (id: string) => {
    // Optimistic update
    setRecipes(prev => prev.filter(r => r.id !== id));

    const { error } = await client.recipes.delete(id);
    if (error) {
      console.error('Failed to delete recipe:', error);
      // Refresh to restore state on error
      await refreshRecipes();
    }
  };

  const getAllTags = (): string[] => {
    const tagSet = new Set<string>();
    recipes.forEach(recipe => {
      recipe.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  return (
    <RecipeContext.Provider
      value={{ recipes, isLoading, addRecipe, updateRecipe, deleteRecipe, getAllTags, refreshRecipes }}
    >
      {children}
    </RecipeContext.Provider>
  );
}

export function useRecipes() {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
}
