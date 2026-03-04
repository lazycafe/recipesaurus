import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Cookbook } from '../types/Cookbook';
import { cookbooksApi, CookbookResponse } from '../utils/api';
import { useAuth } from './AuthContext';

interface CookbookContextType {
  ownedCookbooks: Cookbook[];
  sharedCookbooks: Cookbook[];
  isLoading: boolean;
  createCookbook: (name: string, description?: string) => Promise<string | null>;
  updateCookbook: (id: string, data: { name?: string; description?: string }) => Promise<boolean>;
  deleteCookbook: (id: string) => Promise<boolean>;
  addRecipeToCookbook: (cookbookId: string, recipeId: string) => Promise<boolean>;
  removeRecipeFromCookbook: (cookbookId: string, recipeId: string) => Promise<boolean>;
  refreshCookbooks: () => Promise<void>;
}

const CookbookContext = createContext<CookbookContextType | undefined>(undefined);

function mapCookbookResponse(c: CookbookResponse): Cookbook {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    recipeCount: c.recipeCount,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    isOwner: c.isOwner,
    ownerName: c.ownerName,
  };
}

export function CookbookProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ownedCookbooks, setOwnedCookbooks] = useState<Cookbook[]>([]);
  const [sharedCookbooks, setSharedCookbooks] = useState<Cookbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCookbooks = useCallback(async () => {
    if (!user) {
      setOwnedCookbooks([]);
      setSharedCookbooks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await cookbooksApi.getAll();
      if (data) {
        setOwnedCookbooks(data.owned.map(mapCookbookResponse));
        setSharedCookbooks(data.shared.map(mapCookbookResponse));
      }
    } catch (error) {
      console.error('Failed to fetch cookbooks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCookbooks();
  }, [refreshCookbooks]);

  const createCookbook = useCallback(async (name: string, description?: string): Promise<string | null> => {
    const { data, error } = await cookbooksApi.create({ name, description });
    if (error || !data) {
      console.error('Failed to create cookbook:', error);
      return null;
    }
    await refreshCookbooks();
    return data.id;
  }, [refreshCookbooks]);

  const updateCookbook = useCallback(async (id: string, data: { name?: string; description?: string }): Promise<boolean> => {
    const { error } = await cookbooksApi.update(id, data);
    if (error) {
      console.error('Failed to update cookbook:', error);
      return false;
    }
    await refreshCookbooks();
    return true;
  }, [refreshCookbooks]);

  const deleteCookbook = useCallback(async (id: string): Promise<boolean> => {
    // Optimistic update
    setOwnedCookbooks(prev => prev.filter(c => c.id !== id));

    const { error } = await cookbooksApi.delete(id);
    if (error) {
      console.error('Failed to delete cookbook:', error);
      await refreshCookbooks();
      return false;
    }
    return true;
  }, [refreshCookbooks]);

  const addRecipeToCookbook = useCallback(async (cookbookId: string, recipeId: string): Promise<boolean> => {
    const { error } = await cookbooksApi.addRecipe(cookbookId, recipeId);
    if (error) {
      console.error('Failed to add recipe to cookbook:', error);
      return false;
    }
    await refreshCookbooks();
    return true;
  }, [refreshCookbooks]);

  const removeRecipeFromCookbook = useCallback(async (cookbookId: string, recipeId: string): Promise<boolean> => {
    const { error } = await cookbooksApi.removeRecipe(cookbookId, recipeId);
    if (error) {
      console.error('Failed to remove recipe from cookbook:', error);
      return false;
    }
    await refreshCookbooks();
    return true;
  }, [refreshCookbooks]);

  return (
    <CookbookContext.Provider value={{
      ownedCookbooks,
      sharedCookbooks,
      isLoading,
      createCookbook,
      updateCookbook,
      deleteCookbook,
      addRecipeToCookbook,
      removeRecipeFromCookbook,
      refreshCookbooks,
    }}>
      {children}
    </CookbookContext.Provider>
  );
}

export function useCookbooks() {
  const context = useContext(CookbookContext);
  if (!context) {
    throw new Error('useCookbooks must be used within a CookbookProvider');
  }
  return context;
}
