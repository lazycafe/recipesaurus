import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Heart, Loader2, User } from 'lucide-react';
import { useDiscovery } from '../context/DiscoveryContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRecipes } from '../context/RecipeContext';
import { Recipe, Cookbook } from '../client/types';
import { Recipe as LocalRecipe, RecipeFormData } from '../types/Recipe';
import { DinoMascot } from './DinoMascot';
import { RecipeDetail } from './RecipeDetail';
import { AddRecipeModal } from './AddRecipeModal';
import { buildRemixDraft } from '../utils/recipeRemix';

export function PublicCookbookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { getPublicCookbook, saveRecipe, remixRecipe } = useDiscovery();
  const { updateRecipe, refreshRecipes } = useRecipes();

  const [cookbook, setCookbook] = useState<Cookbook | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [remixingRecipeId, setRemixingRecipeId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsLoading(true);
      const result = await getPublicCookbook(id);
      if (result) {
        setCookbook(result.cookbook);
        setRecipes(result.recipes);
      }
      setIsLoading(false);
    }
    load();
  }, [id, getPublicCookbook]);

  const handleSaveRecipe = async (recipe: Recipe) => {
    if (!user) {
      showToast({ message: 'Please sign in to save recipes', type: 'info' });
      return;
    }
    setSavingRecipeId(recipe.id);
    const savedId = await saveRecipe(recipe.id);
    setSavingRecipeId(null);

    if (savedId) {
      showToast({
        message: 'Saved to My Recipes',
        type: 'success',
        action: {
          label: 'View',
          onClick: () => navigate('/my-recipes'),
        },
      });
    }
  };

  const handleRemixRecipe = async (recipe: Recipe) => {
    if (!user) {
      showToast({ message: 'Please sign in to make your own version', type: 'info' });
      return;
    }

    setRemixingRecipeId(recipe.id);
    const remixedId = await remixRecipe(recipe.id);
    setRemixingRecipeId(null);

    if (remixedId) {
      await refreshRecipes();
      setSelectedRecipe(null);
      setEditingRecipe(buildRemixDraft(recipe, remixedId, user));
      showToast({
        message: 'Your version is ready to edit',
        type: 'success',
      });
    }
  };

  const parseFormData = (formData: RecipeFormData) => ({
    title: formData.title.trim(),
    description: formData.description.trim(),
    ingredients: formData.ingredients
      .split('\n')
      .map((ingredient: string) => ingredient.trim())
      .filter(Boolean),
    instructions: formData.instructions
      .split('\n')
      .map((step: string) => step.trim())
      .filter(Boolean),
    tags: formData.tags
      .split(',')
      .map((tag: string) => tag.trim().toLowerCase())
      .filter(Boolean),
    imageUrl: formData.imageUrl?.trim() || undefined,
    prepTime: formData.prepTime?.trim() || undefined,
    cookTime: formData.cookTime?.trim() || undefined,
    servings: formData.servings?.trim() || undefined,
    sourceUrl: formData.sourceUrl?.trim() || undefined,
    isPublic: formData.isPublic,
  });

  const handleUpdateRecipe = async (formData: RecipeFormData) => {
    if (!editingRecipe) return;
    try {
      await updateRecipe(editingRecipe.id, parseFormData(formData));
      setEditingRecipe(null);
    } catch (error) {
      console.error('Failed to update remixed recipe:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="public-cookbook-page">
        <div className="public-cookbook-loading">
          <Loader2 size={32} className="spin" />
          <p>Loading cookbook...</p>
        </div>
      </div>
    );
  }

  if (!cookbook) {
    return (
      <div className="public-cookbook-page">
        <div className="public-cookbook-empty">
          <DinoMascot size={80} />
          <h2>Cookbook not found</h2>
          <p>This cookbook may have been removed or made private.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="public-cookbook-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        <ArrowLeft size={20} />
        Back to Discover
      </button>

      <header className="public-cookbook-header">
        <div className="public-cookbook-cover">
          {cookbook.coverImage ? (
            <img src={cookbook.coverImage} alt={cookbook.name} />
          ) : (
            <div className="public-cookbook-cover-placeholder">
              <BookOpen size={64} />
            </div>
          )}
        </div>
        <div className="public-cookbook-info">
          <h1>{cookbook.name}</h1>
          {cookbook.description && <p className="description">{cookbook.description}</p>}
          <div className="meta">
            {cookbook.ownerName && (
              <span className="author">
                <User size={14} />
                {cookbook.ownerName}
              </span>
            )}
            <span className="recipe-count">
              <BookOpen size={14} />
              {cookbook.recipeCount} recipes
            </span>
          </div>
        </div>
      </header>

      <section className="public-cookbook-recipes">
        <h2>Recipes in this cookbook</h2>
        {recipes.length === 0 ? (
          <div className="no-recipes">
            <p>No recipes in this cookbook yet.</p>
          </div>
        ) : (
          <div className="public-cookbook-grid">
            {recipes.map(recipe => (
              <article
                key={recipe.id}
                className="public-recipe-card"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <div className="public-recipe-card-image">
                  {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.title} loading="lazy" />
                  ) : (
                    <div className="public-recipe-card-placeholder">
                      <DinoMascot size={48} />
                    </div>
                  )}
                  <button
                    className="save-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveRecipe(recipe);
                    }}
                    disabled={savingRecipeId === recipe.id}
                    aria-label="Save recipe"
                  >
                    {savingRecipeId === recipe.id ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      <Heart size={16} />
                    )}
                  </button>
                </div>
                <div className="public-recipe-card-body">
                  <h3>{recipe.title}</h3>
                  {recipe.sourceRecipe && (
                    <p className="public-recipe-card-remix">Version of {recipe.sourceRecipe.title}</p>
                  )}
                  {recipe.tags.length > 0 && (
                    <div className="tags">
                      {recipe.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="tag-sm">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onSave={() => handleSaveRecipe(selectedRecipe)}
          onRemix={() => handleRemixRecipe(selectedRecipe)}
          isRemixing={remixingRecipeId === selectedRecipe.id}
          isPublicView={true}
        />
      )}

      {editingRecipe && (
        <AddRecipeModal
          recipe={{
            ...editingRecipe,
            imageUrl: editingRecipe.imageUrl ?? undefined,
            sourceUrl: editingRecipe.sourceUrl ?? undefined,
            prepTime: editingRecipe.prepTime ?? undefined,
            cookTime: editingRecipe.cookTime ?? undefined,
            servings: editingRecipe.servings ?? undefined,
          } as LocalRecipe}
          onClose={() => setEditingRecipe(null)}
          onSubmit={handleUpdateRecipe}
        />
      )}
    </div>
  );
}
