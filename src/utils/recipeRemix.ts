import type { Recipe, RecipeSourceSnapshot, User } from '../client/types';

export function buildSourceSnapshot(recipe: Recipe): RecipeSourceSnapshot {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    tags: recipe.tags,
    imageUrl: recipe.imageUrl || null,
    sourceUrl: recipe.sourceUrl || null,
    prepTime: recipe.prepTime || null,
    cookTime: recipe.cookTime || null,
    servings: recipe.servings || null,
    ownerId: recipe.ownerId || null,
    ownerName: recipe.ownerName || null,
    createdAt: recipe.createdAt,
  };
}

export function buildRemixDraft(recipe: Recipe, remixedId: string, user: User): Recipe {
  return {
    ...recipe,
    id: remixedId,
    ownerId: user.id,
    ownerName: user.name,
    isOwner: true,
    isPublic: false,
    createdAt: Date.now(),
    sourceRecipeId: recipe.id,
    sourceRecipe: recipe.sourceRecipe || buildSourceSnapshot(recipe),
  };
}
