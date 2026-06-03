import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Heart, Loader2, User, Check } from 'lucide-react';
import { useDiscovery } from '../context/DiscoveryContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCookbooks } from '../context/CookbookContext';
import { Recipe, Cookbook } from '../client/types';
import { DinoMascot } from './DinoMascot';
import { RecipeDetail } from './RecipeDetail';

export function PublicCookbookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { refreshCookbooks } = useCookbooks();
  const { getPublicCookbook, saveRecipe, saveCookbook } = useDiscovery();

  const [cookbook, setCookbook] = useState<Cookbook | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [isSavingCookbook, setIsSavingCookbook] = useState(false);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(() => new Set());
  const [isCookbookSaved, setIsCookbookSaved] = useState(false);

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
    if (savedRecipeIds.has(recipe.id)) return;
    if (!user) {
      showToast({ message: 'Please sign in to save recipes', type: 'info' });
      return;
    }
    setSavingRecipeId(recipe.id);
    const savedId = await saveRecipe(recipe.id);
    setSavingRecipeId(null);

    if (savedId) {
      setSavedRecipeIds(prev => new Set(prev).add(recipe.id));
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

  const handleSaveCookbook = async () => {
    if (!cookbook) return;
    if (isCookbookSaved) return;
    if (!user) {
      showToast({ message: 'Please sign in to save cookbooks', type: 'info' });
      return;
    }

    setIsSavingCookbook(true);
    const savedId = await saveCookbook(cookbook.id);
    setIsSavingCookbook(false);

    if (savedId) {
      setIsCookbookSaved(true);
      await refreshCookbooks();
      showToast({
        message: 'Cookbook saved to your collection',
        type: 'success',
        action: {
          label: 'View',
          onClick: () => navigate('/cookbooks'),
        },
      });
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
              cookbook.ownerId ? (
                <Link to={`/profiles/${cookbook.ownerId}`} className="author">
                  <User size={14} />
                  {cookbook.ownerName}
                </Link>
              ) : (
                <span className="author">
                  <User size={14} />
                  {cookbook.ownerName}
                </span>
              )
            )}
            <span className="recipe-count">
              <BookOpen size={14} />
              {cookbook.recipeCount} recipes
            </span>
          </div>
          <div className="public-cookbook-actions">
            <button
              className="btn-primary"
              onClick={handleSaveCookbook}
              disabled={isSavingCookbook || isCookbookSaved}
            >
              {isSavingCookbook ? (
                <Loader2 size={16} className="spin" />
              ) : isCookbookSaved ? (
                <Check size={16} />
              ) : (
                <Heart size={16} />
              )}
              <span>{isCookbookSaved ? 'Saved' : 'Save Cookbook'}</span>
            </button>
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
                    className={`save-btn ${savedRecipeIds.has(recipe.id) ? 'saved' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (savedRecipeIds.has(recipe.id)) return;
                      handleSaveRecipe(recipe);
                    }}
                    disabled={savingRecipeId === recipe.id || savedRecipeIds.has(recipe.id)}
                    aria-label={savedRecipeIds.has(recipe.id) ? 'Recipe saved' : 'Save recipe'}
                  >
                    {savingRecipeId === recipe.id ? (
                      <Loader2 size={16} className="spin" />
                    ) : savedRecipeIds.has(recipe.id) ? (
                      <Check size={16} />
                    ) : (
                      <Heart size={16} />
                    )}
                  </button>
                </div>
                <div className="public-recipe-card-body">
                  <h3>{recipe.title}</h3>
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
          isSaving={savingRecipeId === selectedRecipe.id}
          isSaved={savedRecipeIds.has(selectedRecipe.id)}
          isPublicView={true}
        />
      )}
    </div>
  );
}
