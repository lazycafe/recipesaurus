import type { Recipe } from '../client/types';

const PENDING_PUBLIC_HOME_RECIPE_SAVE_KEY = 'pendingPublicHomeRecipeSave';

export interface PendingPublicHomeRecipeSave {
  recipeId: string;
  title: string;
}

function getSessionStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function storePendingPublicHomeRecipeSave(recipe: Pick<Recipe, 'id' | 'title'>) {
  const storage = getSessionStorage();
  if (!storage) return;

  storage.setItem(PENDING_PUBLIC_HOME_RECIPE_SAVE_KEY, JSON.stringify({
    recipeId: recipe.id,
    title: recipe.title,
  }));
}

export function takePendingPublicHomeRecipeSave(): PendingPublicHomeRecipeSave | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  const rawPendingSave = storage.getItem(PENDING_PUBLIC_HOME_RECIPE_SAVE_KEY);
  if (!rawPendingSave) return null;

  storage.removeItem(PENDING_PUBLIC_HOME_RECIPE_SAVE_KEY);

  try {
    const pendingSave = JSON.parse(rawPendingSave) as Partial<PendingPublicHomeRecipeSave>;
    if (typeof pendingSave.recipeId !== 'string' || pendingSave.recipeId.trim() === '') {
      return null;
    }

    return {
      recipeId: pendingSave.recipeId,
      title: typeof pendingSave.title === 'string' && pendingSave.title.trim()
        ? pendingSave.title
        : 'recipe',
    };
  } catch {
    return null;
  }
}
