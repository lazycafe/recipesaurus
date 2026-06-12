import { useState, useEffect, useMemo } from 'react';
import { Loader2, User, ChefHat } from 'lucide-react';
import { useClient } from '../client/ClientContext';
import type { Recipe as ClientRecipe } from '../client/types';
import { Recipe } from '../types/Recipe';
import { DinoMascot } from './DinoMascot';
import { RecipeCard } from './RecipeCard';
import { RecipeDetail } from './RecipeDetail';
import { getRecipeDetailRouteId } from '../utils/recipeDetailRoute';

interface SharedCookbook {
  id: string;
  name: string;
  description?: string;
  ownerName: string;
  recipeCount: number;
}

interface SharedCookbookViewProps {
  token: string;
}

interface SharedRecipe extends Recipe {
  isSaved?: boolean;
  savedCopyId?: string | null;
}

function mapRecipeResponse(r: ClientRecipe): SharedRecipe {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    ingredients: r.ingredients,
    instructions: r.instructions,
    tags: r.tags,
    imageUrl: r.imageUrl || undefined,
    sourceUrl: r.sourceUrl || undefined,
    prepTime: r.prepTime || undefined,
    cookTime: r.cookTime || undefined,
    servings: r.servings || undefined,
    isPublic: r.isPublic,
    createdAt: r.createdAt,
    ownerId: r.ownerId,
    ownerName: r.ownerName,
    isOwner: r.isOwner,
    isSaved: r.isSaved,
    savedCopyId: r.savedCopyId,
  };
}

export function SharedCookbookView({ token }: SharedCookbookViewProps) {
  const client = useClient();
  const [cookbook, setCookbook] = useState<SharedCookbook | null>(null);
  const [recipes, setRecipes] = useState<SharedRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<SharedRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [routeSearch, setRouteSearch] = useState(() => window.location.search);
  const requestedRecipeId = useMemo(() => getRecipeDetailRouteId(routeSearch), [routeSearch]);

  useEffect(() => {
    async function fetchSharedCookbook() {
      setIsLoading(true);
      setError('');
      const { data, error: apiError } = await client.cookbooks.getShared(token);

      if (apiError) {
        setError(apiError);
      } else if (data) {
        setCookbook({
          id: data.cookbook.id,
          name: data.cookbook.name,
          description: data.cookbook.description || undefined,
          ownerName: data.cookbook.ownerName || 'Unknown',
          recipeCount: data.cookbook.recipeCount,
        });
        setRecipes(data.recipes.map(mapRecipeResponse));
      }

      setIsLoading(false);
    }

    fetchSharedCookbook();
  }, [client, token]);

  useEffect(() => {
    const handlePopState = () => setRouteSearch(window.location.search);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!requestedRecipeId || recipes.length === 0) return;

    const recipe = recipes.find(item => item.id === requestedRecipeId);
    if (recipe) {
      setSelectedRecipe(current => (current?.id === recipe.id ? current : recipe));
    }
  }, [requestedRecipeId, recipes]);

  const canSaveRecipe = (recipe: SharedRecipe) => recipe.isOwner === false && recipe.isPublic === true;

  const handleSaveRecipe = async (recipe: SharedRecipe) => {
    if (!canSaveRecipe(recipe) || recipe.isSaved) return;

    setSavingRecipeId(recipe.id);
    const result = await client.discover.saveRecipe(recipe.id);
    setSavingRecipeId(null);

    if (!result.data?.id) return;

    const savedCopyId = result.data.id;
    setRecipes(currentRecipes => currentRecipes.map(currentRecipe =>
      currentRecipe.id === recipe.id
        ? { ...currentRecipe, isSaved: true, savedCopyId }
        : currentRecipe
    ));
    setSelectedRecipe(currentRecipe =>
      currentRecipe?.id === recipe.id
        ? { ...currentRecipe, isSaved: true, savedCopyId }
        : currentRecipe
    );
  };

  if (isLoading) {
    return (
      <div className="shared-view loading-screen">
        <Loader2 size={32} className="spin" />
      </div>
    );
  }

  if (error || !cookbook) {
    return (
      <div className="shared-view shared-error">
        <DinoMascot size={120} />
        <h1>Cookbook Not Found</h1>
        <p>This share link may have expired or been revoked.</p>
        <a href="/" className="btn-primary">Go to Recipesaurus</a>
      </div>
    );
  }

  return (
    <div className="shared-view">
      <header className="shared-header">
        <div className="shared-header-content">
          <a href="/" className="shared-header-home" aria-label="Recipesaurus home">
            <DinoMascot size={48} />
          </a>
          <div className="shared-header-info">
            <h1>{cookbook.name}</h1>
            {cookbook.description && <p>{cookbook.description}</p>}
            <span className="shared-owner">
              <User size={14} />
              Shared by {cookbook.ownerName}
            </span>
          </div>
        </div>
      </header>

      <main className="shared-main">
        <div className="container">
          <p className="results-count">
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
          </p>

          {recipes.length > 0 ? (
            <div className="recipe-grid">
              {recipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => setSelectedRecipe(recipe)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <DinoMascot size={80} />
              <h2>No recipes yet</h2>
              <p>This cookbook is empty.</p>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <a href="/" className="footer-link">
          <ChefHat size={16} />
          <span>Recipesaurus</span>
        </a>
      </footer>

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onSave={canSaveRecipe(selectedRecipe) ? () => handleSaveRecipe(selectedRecipe) : undefined}
          isSaving={savingRecipeId === selectedRecipe.id}
          isSaved={Boolean(selectedRecipe.isSaved)}
          readOnly
          isPublicView={canSaveRecipe(selectedRecipe)}
        />
      )}
    </div>
  );
}
