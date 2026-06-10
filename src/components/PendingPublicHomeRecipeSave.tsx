import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiscovery } from '../context/DiscoveryContext';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';
import {
  clearPendingPublicHomeRecipeSave,
  readPendingPublicHomeRecipeSave,
} from '../utils/pendingPublicHomeRecipeSave';

let pendingPublicHomeRecipeSavePromise: Promise<void> | null = null;

export function PendingPublicHomeRecipeSave() {
  const { saveRecipe } = useDiscovery();
  const { refreshRecipes } = useRecipes();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (pendingPublicHomeRecipeSavePromise) return;

    const pendingSave = readPendingPublicHomeRecipeSave();
    if (!pendingSave) return;

    const savePendingRecipe = async () => {
      try {
        const savedRecipeId = await saveRecipe(pendingSave.recipeId);

        if (!savedRecipeId) {
          showToast({
            message: `Could not save ${pendingSave.title}. Please try again.`,
            type: 'error',
          });
          return;
        }

        clearPendingPublicHomeRecipeSave(pendingSave.recipeId);
        await refreshRecipes();

        showToast({
          message: `${pendingSave.title} saved to My Recipes`,
          type: 'success',
          action: {
            label: 'View',
            onClick: () => navigate('/my-recipes', { replace: true }),
          },
        });
      } catch (error) {
        console.error('Failed to save pending public home recipe:', error);
        showToast({
          message: `Could not save ${pendingSave.title}. Please try again.`,
          type: 'error',
        });
      } finally {
        pendingPublicHomeRecipeSavePromise = null;
      }
    };

    pendingPublicHomeRecipeSavePromise = savePendingRecipe();
  }, [navigate, refreshRecipes, saveRecipe, showToast]);

  return null;
}
