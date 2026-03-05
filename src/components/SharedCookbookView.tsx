import { useState, useEffect } from 'react';
import { Loader2, User, Clock, Users, X, ChefHat } from 'lucide-react';
import { cookbooksApi, RecipeResponse } from '../utils/api';
import { Recipe } from '../types/Recipe';
import { DinoMascot } from './DinoMascot';
import { RecipeCard } from './RecipeCard';

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

function mapRecipeResponse(r: RecipeResponse): Recipe {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    ingredients: r.ingredients,
    instructions: r.instructions,
    tags: r.tags,
    imageUrl: r.imageUrl,
    sourceUrl: r.sourceUrl,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    servings: r.servings,
    createdAt: r.createdAt,
  };
}

export function SharedCookbookView({ token }: SharedCookbookViewProps) {
  const [cookbook, setCookbook] = useState<SharedCookbook | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchSharedCookbook() {
      setIsLoading(true);
      const { data, error: apiError } = await cookbooksApi.getShared(token);

      if (apiError) {
        setError(apiError);
      } else if (data) {
        setCookbook({
          id: data.cookbook.id,
          name: data.cookbook.name,
          description: data.cookbook.description,
          ownerName: data.cookbook.ownerName || 'Unknown',
          recipeCount: data.cookbook.recipeCount,
        });
        setRecipes(data.recipes.map(mapRecipeResponse));
      }

      setIsLoading(false);
    }

    fetchSharedCookbook();
  }, [token]);

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
          <DinoMascot size={48} />
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
        <div className="modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="recipe-detail" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedRecipe(null)} aria-label="Close">
              <X size={20} strokeWidth={2} />
            </button>

            {selectedRecipe.imageUrl && (
              <div className="detail-image">
                <img src={selectedRecipe.imageUrl} alt={selectedRecipe.title} />
              </div>
            )}

            <div className="detail-content">
              <h2>{selectedRecipe.title}</h2>
              <p className="detail-description">{selectedRecipe.description}</p>

              <div className="detail-meta">
                {selectedRecipe.prepTime && (
                  <div className="meta-item">
                    <Clock size={16} />
                    <span>Prep: {selectedRecipe.prepTime}</span>
                  </div>
                )}
                {selectedRecipe.cookTime && (
                  <div className="meta-item">
                    <Clock size={16} />
                    <span>Cook: {selectedRecipe.cookTime}</span>
                  </div>
                )}
                {selectedRecipe.servings && (
                  <div className="meta-item">
                    <Users size={16} />
                    <span>Serves: {selectedRecipe.servings}</span>
                  </div>
                )}
              </div>

              {selectedRecipe.tags.length > 0 && (
                <div className="detail-tags">
                  {selectedRecipe.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}

              <section className="detail-section">
                <h3>Ingredients</h3>
                <ul className="ingredients-list">
                  {selectedRecipe.ingredients.map((ingredient, i) => (
                    <li key={i}>{ingredient}</li>
                  ))}
                </ul>
              </section>

              <section className="detail-section">
                <h3>Instructions</h3>
                <ol className="instructions-list">
                  {selectedRecipe.instructions.map((instruction, i) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ol>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
