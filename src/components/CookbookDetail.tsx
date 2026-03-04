import { useState, useEffect } from 'react';
import { X, Share2, Pencil, Loader2, User, Trash2 } from 'lucide-react';
import { Cookbook } from '../types/Cookbook';
import { Recipe } from '../types/Recipe';
import { cookbooksApi, RecipeResponse } from '../utils/api';
import { RecipeCard } from './RecipeCard';
import { DinoMascot } from './DinoMascot';

interface CookbookDetailProps {
  cookbook: Cookbook;
  onClose: () => void;
  onEdit: () => void;
  onShare: () => void;
  onViewRecipe: (recipe: Recipe) => void;
  onRemoveRecipe: (recipeId: string) => void;
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

export function CookbookDetail({
  cookbook,
  onClose,
  onEdit,
  onShare,
  onViewRecipe,
  onRemoveRecipe,
}: CookbookDetailProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCookbook() {
      setIsLoading(true);
      const { data } = await cookbooksApi.get(cookbook.id);
      if (data) {
        setRecipes(data.recipes.map(mapRecipeResponse));
      }
      setIsLoading(false);
    }
    fetchCookbook();
  }, [cookbook.id]);

  const handleRemoveRecipe = (recipeId: string) => {
    if (confirm('Remove this recipe from the cookbook?')) {
      setRecipes(prev => prev.filter(r => r.id !== recipeId));
      onRemoveRecipe(recipeId);
    }
  };

  return (
    <div className="modal-overlay cookbook-detail-overlay" onClick={onClose}>
      <div className="cookbook-detail" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} strokeWidth={2} />
        </button>

        <div className="cookbook-detail-header">
          <div className="cookbook-detail-info">
            <h2>{cookbook.name}</h2>
            {cookbook.description && (
              <p className="cookbook-detail-description">{cookbook.description}</p>
            )}
            {!cookbook.isOwner && cookbook.ownerName && (
              <p className="cookbook-detail-owner">
                <User size={14} />
                Shared by {cookbook.ownerName}
              </p>
            )}
          </div>

          {cookbook.isOwner && (
            <div className="cookbook-detail-actions">
              <button className="btn-secondary" onClick={onEdit}>
                <Pencil size={16} />
                Edit
              </button>
              <button className="btn-primary" onClick={onShare}>
                <Share2 size={16} />
                Share
              </button>
            </div>
          )}
        </div>

        <div className="cookbook-detail-content">
          {isLoading ? (
            <div className="loading-state">
              <Loader2 size={32} className="spin" />
            </div>
          ) : recipes.length > 0 ? (
            <>
              <p className="results-count">
                {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
              </p>
              <div className="recipe-grid">
                {recipes.map(recipe => (
                  <div key={recipe.id} className="cookbook-recipe-card">
                    <RecipeCard
                      recipe={recipe}
                      onClick={() => onViewRecipe(recipe)}
                      onDelete={() => {}}
                    />
                    {cookbook.isOwner && (
                      <button
                        className="remove-from-cookbook"
                        onClick={() => handleRemoveRecipe(recipe.id)}
                        title="Remove from cookbook"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <DinoMascot size={80} />
              <h3>No recipes yet</h3>
              <p>Add recipes to this cookbook from your recipe collection.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
