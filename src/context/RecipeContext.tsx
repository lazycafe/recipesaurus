import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Recipe } from '../types/Recipe';
import { recipesApi, RecipeResponse } from '../utils/api';
import { useAuth } from './AuthContext';

interface RecipeContextType {
  recipes: Recipe[];
  isLoading: boolean;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  getAllTags: () => string[];
  refreshRecipes: () => Promise<void>;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

function mapRecipeResponse(r: RecipeResponse): Recipe {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    ingredients: r.ingredients,
    instructions: r.instructions,
    tags: r.tags,
    imageUrl: r.imageUrl,
    sourceUrl: r.sourceUrl,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    servings: r.servings,
    createdAt: r.createdAt,
  };
}

export function RecipeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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
      const { data, error } = await recipesApi.getAll();
      if (data?.recipes) {
        setRecipes(data.recipes.map(mapRecipeResponse));
      } else if (error) {
        console.error('Failed to fetch recipes:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshRecipes();
  }, [refreshRecipes]);

  const addRecipe = async (recipeData: Omit<Recipe, 'id' | 'createdAt'>) => {
    const { data, error } = await recipesApi.create({
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

  const deleteRecipe = async (id: string) => {
    // Optimistic update
    setRecipes(prev => prev.filter(r => r.id !== id));

    const { error } = await recipesApi.delete(id);
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
      value={{ recipes, isLoading, addRecipe, deleteRecipe, getAllTags, refreshRecipes }}
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
