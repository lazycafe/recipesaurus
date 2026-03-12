import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Cookbook } from '../types/Cookbook';
import { useClient } from '../client/ClientContext';
import { useAuth } from './AuthContext';
import type { Cookbook as ClientCookbook } from '../client/types';

interface CookbookContextType {
  ownedCookbooks: Cookbook[];
  sharedCookbooks: Cookbook[];
  isLoading: boolean;
  createCookbook: (data: { name: string; description?: string; coverImage?: string; isPublic?: boolean }) => Promise<string | null>;
  updateCookbook: (id: string, data: { name?: string; description?: string; coverImage?: string; isPublic?: boolean }) => Promise<boolean>;
  deleteCookbook: (id: string) => Promise<boolean>;
  leaveCookbook: (id: string) => Promise<boolean>;
  addRecipeToCookbook: (cookbookId: string, recipeId: string) => Promise<boolean>;
  removeRecipeFromCookbook: (cookbookId: string, recipeId: string) => Promise<boolean>;
  refreshCookbooks: () => Promise<void>;
}

const CookbookContext = createContext<CookbookContextType | undefined>(undefined);

function mapCookbookResponse(c: ClientCookbook): Cookbook {
  return {
    id: c.id,
    name: c.name,
    description: c.description || undefined,
    coverImage: c.coverImage || undefined,
    recipeCount: c.recipeCount,
    isSystem: c.isSystem,
    systemType: c.systemType,
    isPublic: c.isPublic,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    isOwner: c.isOwner,
    ownerName: c.ownerName,
  };
}

export function CookbookProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const client = useClient();
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
      const { data } = await client.cookbooks.list();
      if (data) {
        setOwnedCookbooks(data.owned.map(mapCookbookResponse));
        setSharedCookbooks(data.shared.map(mapCookbookResponse));
      }
    } catch (error) {
      console.error('Failed to fetch cookbooks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, client]);

  useEffect(() => {
    refreshCookbooks();
  }, [refreshCookbooks]);

  const createCookbook = useCallback(async (cookbookData: { name: string; description?: string; coverImage?: string; isPublic?: boolean }): Promise<string | null> => {
    const { data, error } = await client.cookbooks.create(cookbookData);
    if (error || !data) {
      console.error('Failed to create cookbook:', error);
      return null;
    }
    await refreshCookbooks();
    return data.id;
  }, [client, refreshCookbooks]);

  const updateCookbook = useCallback(async (id: string, data: { name?: string; description?: string; coverImage?: string; isPublic?: boolean }): Promise<boolean> => {
    const { error } = await client.cookbooks.update(id, data);
    if (error) {
      console.error('Failed to update cookbook:', error);
      return false;
    }
    await refreshCookbooks();
    return true;
  }, [client, refreshCookbooks]);

  const deleteCookbook = useCallback(async (id: string): Promise<boolean> => {
    // Optimistic update
    setOwnedCookbooks(prev => prev.filter(c => c.id !== id));

    const { error } = await client.cookbooks.delete(id);
    if (error) {
      console.error('Failed to delete cookbook:', error);
      await refreshCookbooks();
      return false;
    }
    return true;
  }, [client, refreshCookbooks]);

  const leaveCookbook = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    // Optimistic update
    setSharedCookbooks(prev => prev.filter(c => c.id !== id));

    const { error } = await client.cookbooks.removeShare(id, user.id);
    if (error) {
      console.error('Failed to leave cookbook:', error);
      await refreshCookbooks();
      return false;
    }
    return true;
  }, [client, user, refreshCookbooks]);

  const addRecipeToCookbook = useCallback(async (cookbookId: string, recipeId: string): Promise<boolean> => {
    const { error } = await client.cookbooks.addRecipe(cookbookId, recipeId);
    if (error) {
      console.error('Failed to add recipe to cookbook:', error);
      return false;
    }
    await refreshCookbooks();
    return true;
  }, [client, refreshCookbooks]);

  const removeRecipeFromCookbook = useCallback(async (cookbookId: string, recipeId: string): Promise<boolean> => {
    const { error } = await client.cookbooks.removeRecipe(cookbookId, recipeId);
    if (error) {
      console.error('Failed to remove recipe from cookbook:', error);
      return false;
    }
    await refreshCookbooks();
    return true;
  }, [client, refreshCookbooks]);

  return (
    <CookbookContext.Provider value={{
      ownedCookbooks,
      sharedCookbooks,
      isLoading,
      createCookbook,
      updateCookbook,
      deleteCookbook,
      leaveCookbook,
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
