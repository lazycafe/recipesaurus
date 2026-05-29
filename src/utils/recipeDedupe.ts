interface RecipeLike {
  id: string;
  title: string;
  description?: string | null;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  imageUrl?: string | null;
  sourceUrl?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  servings?: string | null;
  isOwner?: boolean;
  createdAt?: number;
}

const FIELD_SEPARATOR = '\u001f';

function normalizeText(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function normalizeList(values: string[]): string {
  return values
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
    .join(FIELD_SEPARATOR);
}

export function getRecipeDedupeKey(recipe: RecipeLike): string {
  return [
    normalizeText(recipe.title),
    normalizeText(recipe.description),
    normalizeList(recipe.ingredients),
    normalizeList(recipe.instructions),
    normalizeList(recipe.tags),
    normalizeText(recipe.imageUrl),
    normalizeText(recipe.sourceUrl),
    normalizeText(recipe.prepTime),
    normalizeText(recipe.cookTime),
    normalizeText(recipe.servings),
  ].join(FIELD_SEPARATOR);
}

function shouldPreferRecipe<T extends RecipeLike>(current: T, candidate: T): boolean {
  if (candidate.isOwner !== current.isOwner) {
    return candidate.isOwner === true;
  }

  return (candidate.createdAt || 0) > (current.createdAt || 0);
}

export function findDuplicateRecipe<T extends RecipeLike>(
  recipes: T[],
  recipe: RecipeLike
): T | undefined {
  const key = getRecipeDedupeKey(recipe);
  return recipes.find(existing => getRecipeDedupeKey(existing) === key);
}

export function dedupeRecipes<T extends RecipeLike>(recipes: T[]): T[] {
  const selectedByKey = new Map<string, T>();

  for (const recipe of recipes) {
    const key = getRecipeDedupeKey(recipe);
    const selected = selectedByKey.get(key);

    if (!selected || shouldPreferRecipe(selected, recipe)) {
      selectedByKey.set(key, recipe);
    }
  }

  return recipes.filter(recipe => selectedByKey.get(getRecipeDedupeKey(recipe)) === recipe);
}
