import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiscovery } from '../context/DiscoveryContext';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';
import { takePendingPublicHomeRecipeSave } from '../utils/pendingPublicHomeRecipeSave';

export function PendingPublicHomeRecipeSave() {
  const { saveRecipe } = useDiscovery();
  const { refreshRecipes } = useRecipes();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const hasCheckedPendingSave = useRef(false);

  useEffect(() => {
    if (hasCheckedPendingSave.current) return;
    hasCheckedPendingSave.current = true;

    const pendingSave = takePendingPublicHomeRecipeSave();
    if (!pendingSave) return;

    let cancelled = false;

    const savePendingRecipe = async () => {
      const savedRecipeId = await saveRecipe(pendingSave.recipeId);

      if (cancelled) return;

      if (!savedRecipeId) {
        showToast({
          message: `Could not save ${pendingSave.title}. Please try again.`,
          type: 'error',
        });
        return;
      }

      await refreshRecipes();

      if (cancelled) return;

      showToast({
        message: `${pendingSave.title} saved to My Recipes`,
        type: 'success',
        action: {
          label: 'View',
          onClick: () => navigate('/my-recipes'),
        },
      });
    };

    savePendingRecipe();

    return () => {
      cancelled = true;
    };
  }, [navigate, refreshRecipes, saveRecipe, showToast]);

  return null;
}
