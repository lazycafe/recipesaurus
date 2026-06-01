import type { Cookbook } from '../client/types';

function normalize(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))].sort();
}

function idsChanged(current: string[] | undefined, original: string[]): boolean {
  const currentIds = normalizeIds(current || []);
  const originalIds = normalizeIds(original);

  if (currentIds.length === 0 && originalIds.length === 0) {
    return false;
  }

  return currentIds.length !== originalIds.length ||
    currentIds.some((id, index) => id !== originalIds[index]);
}

export function isCookbookModifiedFromSource(cookbook: Cookbook): boolean {
  const source = cookbook.sourceCookbook;
  if (!source) return false;

  return normalize(cookbook.name) !== normalize(source.name) ||
    normalize(cookbook.description) !== normalize(source.description) ||
    normalize(cookbook.coverImage) !== normalize(source.coverImage) ||
    cookbook.recipeCount !== source.recipeCount ||
    idsChanged(cookbook.sourceRecipeIds, source.recipeIds);
}

export function findDuplicateCookbook<T extends Cookbook>(
  cookbooks: T[],
  cookbook: Cookbook
): T | undefined {
  const sourceIds = normalizeIds(cookbook.sourceRecipeIds || []);
  return cookbooks.find(existing =>
    !existing.isSystem &&
    normalize(existing.name) === normalize(cookbook.name) &&
    normalize(existing.description) === normalize(cookbook.description) &&
    normalize(existing.coverImage) === normalize(cookbook.coverImage) &&
    existing.recipeCount === cookbook.recipeCount &&
    (sourceIds.length === 0 || !idsChanged(existing.sourceRecipeIds, sourceIds))
  );
}
