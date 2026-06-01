import type { Cookbook, CookbookSourceSnapshot } from '../client/types';

export function buildCookbookSourceSnapshot(
  cookbook: Cookbook,
  recipeIds: string[] = cookbook.sourceRecipeIds || []
): CookbookSourceSnapshot {
  return {
    id: cookbook.id,
    name: cookbook.name,
    description: cookbook.description || null,
    coverImage: cookbook.coverImage || null,
    recipeCount: recipeIds.length || cookbook.recipeCount,
    recipeIds: [...new Set(recipeIds.filter(Boolean))].sort(),
    ownerId: undefined,
    ownerName: cookbook.ownerName || null,
    createdAt: cookbook.createdAt,
    updatedAt: cookbook.updatedAt,
  };
}
