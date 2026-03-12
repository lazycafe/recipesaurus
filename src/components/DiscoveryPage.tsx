import { useEffect, useState } from 'react';
import { Search, Heart, ChefHat, BookOpen, Loader2, TrendingUp } from 'lucide-react';
import { useDiscovery } from '../context/DiscoveryContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRecipes } from '../context/RecipeContext';
import { Recipe, Cookbook } from '../client/types';
import { Recipe as LocalRecipe, RecipeFormData } from '../types/Recipe';
import { DinoMascot } from './DinoMascot';
import { RecipeDetail } from './RecipeDetail';
import { AddRecipeModal } from './AddRecipeModal';
import { ConfirmModal } from './ConfirmModal';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface RecipeCardCompactProps {
  recipe: Recipe;
  onSave: () => void;
  onClick: () => void;
  isSaving?: boolean;
}

function RecipeCardCompact({ recipe, onSave, onClick, isSaving }: RecipeCardCompactProps) {
  return (
    <article className="discovery-card" onClick={onClick}>
      <div className="discovery-card-image">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.title} loading="lazy" />
        ) : (
          <div className="discovery-card-placeholder">
            <DinoMascot size={48} />
          </div>
        )}
        <button
          className="discovery-save-btn"
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          disabled={isSaving}
          aria-label="Save recipe"
        >
          {isSaving ? <Loader2 size={16} className="spin" /> : <Heart size={16} />}
        </button>
      </div>
      <div className="discovery-card-body">
        <h3 className="discovery-card-title">{recipe.title}</h3>
        {recipe.ownerName && (
          <p className="discovery-card-author">by {recipe.ownerName}</p>
        )}
        {recipe.tags.length > 0 && (
          <div className="discovery-card-tags">
            {recipe.tags.slice(0, 2).map(tag => (
              <span key={tag} className="tag-sm">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

interface CookbookCardCompactProps {
  cookbook: Cookbook;
  onClick: () => void;
}

function CookbookCardCompact({ cookbook, onClick }: CookbookCardCompactProps) {
  return (
    <article className="discovery-card cookbook-card" onClick={onClick}>
      <div className="discovery-card-image">
        {cookbook.coverImage ? (
          <img src={cookbook.coverImage} alt={cookbook.name} loading="lazy" />
        ) : (
          <div className="discovery-card-placeholder cookbook-placeholder">
            <BookOpen size={48} />
          </div>
        )}
      </div>
      <div className="discovery-card-body">
        <h3 className="discovery-card-title">{cookbook.name}</h3>
        {cookbook.ownerName && (
          <p className="discovery-card-author">by {cookbook.ownerName}</p>
        )}
        <p className="discovery-card-count">{cookbook.recipeCount} recipes</p>
      </div>
    </article>
  );
}

const TRENDING_TAGS = ['dinner', 'quick', 'healthy', 'vegetarian', 'dessert', 'breakfast', 'chicken', 'pasta'];

export function DiscoveryPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    recipes,
    cookbooks,
    recipesTotal,
    cookbooksTotal,
    isLoadingRecipes,
    isLoadingCookbooks,
    loadRecipes,
    loadCookbooks,
    loadMoreRecipes,
    loadMoreCookbooks,
    selectedTags,
    setSelectedTags,
    saveRecipe,
  } = useDiscovery();

  const { updateRecipe, deleteRecipe } = useRecipes();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recipes' | 'cookbooks'>('recipes');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);

  useEffect(() => {
    loadRecipes();
    loadCookbooks();
  }, [loadRecipes, loadCookbooks]);

  const handleSaveRecipe = async (recipe: Recipe) => {
    if (!user) {
      alert('Please sign in to save recipes');
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
          onClick: () => {
            window.location.href = '/my-recipes';
          },
        },
      });
    }
  };

  const parseFormData = (formData: RecipeFormData) => ({
    title: formData.title.trim(),
    description: formData.description.trim(),
    ingredients: formData.ingredients
      .split('\n')
      .map((i: string) => i.trim())
      .filter(Boolean),
    instructions: formData.instructions
      .split('\n')
      .map((i: string) => i.trim())
      .filter(Boolean),
    tags: formData.tags
      .split(',')
      .map((t: string) => t.trim().toLowerCase())
      .filter(Boolean),
    imageUrl: formData.imageUrl.trim() || undefined,
    prepTime: formData.prepTime.trim() || undefined,
    cookTime: formData.cookTime.trim() || undefined,
    servings: formData.servings.trim() || undefined,
    sourceUrl: formData.sourceUrl.trim() || undefined,
    isPublic: formData.isPublic,
  });

  const handleUpdateRecipe = async (formData: RecipeFormData) => {
    if (!editingRecipe) return;
    try {
      await updateRecipe(editingRecipe.id, parseFormData(formData));
      setEditingRecipe(null);
      // Refresh the discovery page data
      loadRecipes();
    } catch (error) {
      console.error('Failed to update recipe:', error);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!recipeToDelete) return;
    try {
      await deleteRecipe(recipeToDelete.id);
      setRecipeToDelete(null);
      setSelectedRecipe(null);
      // Refresh the discovery page data
      loadRecipes();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const filteredRecipes = searchQuery
    ? recipes.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recipes;

  const filteredCookbooks = searchQuery
    ? cookbooks.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : cookbooks;

  const hasMoreRecipes = recipes.length < recipesTotal;
  const hasMoreCookbooks = cookbooks.length < cookbooksTotal;

  const { loadMoreRef: recipesLoadMoreRef } = useInfiniteScroll({
    onLoadMore: loadMoreRecipes,
    hasMore: hasMoreRecipes,
    isLoading: isLoadingRecipes,
  });

  const { loadMoreRef: cookbooksLoadMoreRef } = useInfiniteScroll({
    onLoadMore: loadMoreCookbooks,
    hasMore: hasMoreCookbooks,
    isLoading: isLoadingCookbooks,
  });

  return (
    <div className="discovery-page">
      <div className="discovery-header">
        <h1>
          <TrendingUp size={28} />
          Discover
        </h1>
        <p>Explore recipes and cookbooks shared by the community</p>
      </div>

      <div className="discovery-search">
        <div className="search-input-wrapper">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search recipes and cookbooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="discovery-tags">
        <span className="tags-label">Trending:</span>
        {TRENDING_TAGS.map(tag => (
          <button
            key={tag}
            className={`tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
            onClick={() => handleTagClick(tag)}
          >
            {tag}
          </button>
        ))}
        {selectedTags.length > 0 && (
          <button className="tag-clear" onClick={() => setSelectedTags([])}>
            Clear
          </button>
        )}
      </div>

      <div className="discovery-tabs">
        <button
          className={`tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
          onClick={() => setActiveTab('recipes')}
        >
          <ChefHat size={18} />
          Recipes
          {recipesTotal > 0 && <span className="count">({recipesTotal})</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'cookbooks' ? 'active' : ''}`}
          onClick={() => setActiveTab('cookbooks')}
        >
          <BookOpen size={18} />
          Cookbooks
          {cookbooksTotal > 0 && <span className="count">({cookbooksTotal})</span>}
        </button>
      </div>

      {activeTab === 'recipes' && (
        <div className="discovery-content">
          {isLoadingRecipes && recipes.length === 0 ? (
            <div className="discovery-loading">
              <Loader2 size={32} className="spin" />
              <p>Loading recipes...</p>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="discovery-empty">
              <DinoMascot size={80} />
              <h3>No recipes found</h3>
              <p>Be the first to share a recipe with the community!</p>
            </div>
          ) : (
            <>
              <div className="discovery-grid">
                {filteredRecipes.map(recipe => (
                  <RecipeCardCompact
                    key={recipe.id}
                    recipe={recipe}
                    onClick={() => setSelectedRecipe(recipe)}
                    onSave={() => handleSaveRecipe(recipe)}
                    isSaving={savingRecipeId === recipe.id}
                  />
                ))}
              </div>
              {/* Infinite scroll sentinel */}
              <div
                ref={recipesLoadMoreRef}
                className={`infinite-scroll-sentinel ${isLoadingRecipes ? 'loading' : ''}`}
              >
                {isLoadingRecipes && hasMoreRecipes && (
                  <Loader2 size={24} className="spin" />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'cookbooks' && (
        <div className="discovery-content">
          {isLoadingCookbooks && cookbooks.length === 0 ? (
            <div className="discovery-loading">
              <Loader2 size={32} className="spin" />
              <p>Loading cookbooks...</p>
            </div>
          ) : filteredCookbooks.length === 0 ? (
            <div className="discovery-empty">
              <DinoMascot size={80} />
              <h3>No cookbooks found</h3>
              <p>Be the first to share a cookbook with the community!</p>
            </div>
          ) : (
            <>
              <div className="discovery-grid">
                {filteredCookbooks.map(cookbook => (
                  <CookbookCardCompact
                    key={cookbook.id}
                    cookbook={cookbook}
                    onClick={() => {
                      // Navigate to public cookbook view
                      window.location.href = `/discover/cookbooks/${cookbook.id}`;
                    }}
                  />
                ))}
              </div>
              {/* Infinite scroll sentinel */}
              <div
                ref={cookbooksLoadMoreRef}
                className={`infinite-scroll-sentinel ${isLoadingCookbooks ? 'loading' : ''}`}
              >
                {isLoadingCookbooks && hasMoreCookbooks && (
                  <Loader2 size={24} className="spin" />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onSave={!selectedRecipe.isOwner ? () => handleSaveRecipe(selectedRecipe) : undefined}
          onEdit={selectedRecipe.isOwner ? () => {
            setEditingRecipe(selectedRecipe);
            setSelectedRecipe(null);
          } : undefined}
          onDelete={selectedRecipe.isOwner ? () => {
            setRecipeToDelete(selectedRecipe);
          } : undefined}
          isPublicView={!selectedRecipe.isOwner}
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

      {recipeToDelete && (
        <ConfirmModal
          title="Delete Recipe"
          message={`Are you sure you want to delete "${recipeToDelete.title}"? This will remove it from all cookbooks.`}
          confirmText="Delete"
          onConfirm={handleDeleteRecipe}
          onCancel={() => setRecipeToDelete(null)}
        />
      )}
    </div>
  );
}
