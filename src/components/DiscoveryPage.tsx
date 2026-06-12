import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Heart, ChefHat, BookOpen, Loader2, TrendingUp, Compass } from 'lucide-react';
import { useDiscovery } from '../context/DiscoveryContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRecipes } from '../context/RecipeContext';
import { useCookbooks } from '../context/CookbookContext';
import { Recipe, Cookbook } from '../client/types';
import { Recipe as LocalRecipe, RecipeFormData } from '../types/Recipe';
import { DinoMascot } from './DinoMascot';
import { RecipeDetail } from './RecipeDetail';
import { AddRecipeModal } from './AddRecipeModal';
import { ConfirmModal } from './ConfirmModal';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { useSwipeActions } from '../hooks/useSwipeActions';
import { getRecipeDetailRouteId } from '../utils/recipeDetailRoute';

interface RecipeCardCompactProps {
  recipe: Recipe;
  onToggleSave: () => void;
  onClick: () => void;
  onAuthorClick?: () => void;
  isSaving?: boolean;
}

function RecipeCardCompact({ recipe, onToggleSave, onClick, onAuthorClick, isSaving }: RecipeCardCompactProps) {
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const canToggleSave = !recipe.isOwner;
  const { swipeHandlers, shouldIgnoreSwipeClick } = useSwipeActions<HTMLElement>({
    enabled: canToggleSave,
    onSwipeLeft: () => setIsSaveOpen(true),
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (shouldIgnoreSwipeClick()) {
      event.stopPropagation();
      return;
    }

    if (isSaveOpen) {
      setIsSaveOpen(false);
      event.stopPropagation();
      return;
    }

    onClick();
  };

  return (
    <article
      className={`discovery-card ${isSaveOpen ? 'swipe-actions-open' : ''}`.trim()}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View ${recipe.title}`}
      {...swipeHandlers}
    >
      <div className="discovery-card-image">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.title} loading="lazy" />
        ) : (
          <div className="discovery-card-placeholder">
            <DinoMascot size={48} />
          </div>
        )}
        {recipe.isOwner ? (
          <span className="discovery-owned-badge" aria-label="You own this recipe">
            yours
          </span>
        ) : (
          <button
            className={`discovery-save-btn ${recipe.isSaved ? 'saved' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsSaveOpen(false);
              onToggleSave();
            }}
            disabled={isSaving}
            aria-label={recipe.isSaved ? 'Unsave recipe' : 'Save recipe'}
            aria-pressed={recipe.isSaved ? 'true' : 'false'}
          >
            {isSaving ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Heart size={16} fill={recipe.isSaved ? 'currentColor' : 'none'} />
            )}
          </button>
        )}
      </div>
      <div className="discovery-card-body">
        <h3 className="discovery-card-title">{recipe.title}</h3>
        {recipe.ownerName && (
          <button
            className="discovery-card-author"
            onClick={(e) => {
              e.stopPropagation();
              onAuthorClick?.();
            }}
          >
            by {recipe.ownerName}
          </button>
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
  onToggleSave: () => void;
  onAuthorClick?: () => void;
  isSaving?: boolean;
}

function CookbookCardCompact({ cookbook, onClick, onToggleSave, onAuthorClick, isSaving }: CookbookCardCompactProps) {
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const canToggleSave = !cookbook.isOwner;
  const { swipeHandlers, shouldIgnoreSwipeClick } = useSwipeActions<HTMLElement>({
    enabled: canToggleSave,
    onSwipeLeft: () => setIsSaveOpen(true),
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (shouldIgnoreSwipeClick()) {
      event.stopPropagation();
      return;
    }

    if (isSaveOpen) {
      setIsSaveOpen(false);
      event.stopPropagation();
      return;
    }

    onClick();
  };

  return (
    <article
      className={`discovery-card cookbook-card ${isSaveOpen ? 'swipe-actions-open' : ''}`.trim()}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View ${cookbook.name}`}
      {...swipeHandlers}
    >
      <div className="discovery-card-image">
        {cookbook.coverImage ? (
          <img src={cookbook.coverImage} alt={cookbook.name} loading="lazy" />
        ) : (
          <div className="discovery-card-placeholder cookbook-placeholder">
            <BookOpen size={48} />
          </div>
        )}
        {cookbook.isOwner ? (
          <span className="discovery-owned-badge" aria-label="You own this cookbook">
            yours
          </span>
        ) : (
          <button
            className={`discovery-save-btn ${cookbook.isSaved ? 'saved' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsSaveOpen(false);
              onToggleSave();
            }}
            disabled={isSaving}
            aria-label={cookbook.isSaved ? 'Unsave cookbook' : 'Save cookbook'}
            aria-pressed={cookbook.isSaved ? 'true' : 'false'}
          >
            {isSaving ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Heart size={16} fill={cookbook.isSaved ? 'currentColor' : 'none'} />
            )}
          </button>
        )}
      </div>
      <div className="discovery-card-body">
        <h3 className="discovery-card-title">{cookbook.name}</h3>
        {cookbook.ownerName && (
          <button
            className="discovery-card-author"
            onClick={(e) => {
              e.stopPropagation();
              onAuthorClick?.();
            }}
          >
            by {cookbook.ownerName}
          </button>
        )}
        <p className="discovery-card-count">
          <BookOpen size={12} />
          {cookbook.recipeCount} recipes
        </p>
      </div>
    </article>
  );
}

const TRENDING_TAGS = ['dinner', 'quick', 'healthy', 'vegetarian', 'dessert', 'breakfast', 'chicken', 'pasta'];

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

interface DiscoveryPageProps {
  tab?: 'recipes' | 'cookbooks';
}

export function DiscoveryPage({ tab = 'recipes' }: DiscoveryPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshCookbooks } = useCookbooks();
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
    saveCookbook,
    unsaveRecipe,
    unsaveCookbook,
    getPublicRecipe,
  } = useDiscovery();

  const { updateRecipe, deleteRecipe, refreshRecipes } = useRecipes();

  const [recipeSearchQuery, setRecipeSearchQuery] = useState(() => tab === 'recipes' ? searchParams.get('q') || '' : '');
  const [cookbookSearchQuery, setCookbookSearchQuery] = useState(() => tab === 'cookbooks' ? searchParams.get('q') || '' : '');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [savingCookbookId, setSavingCookbookId] = useState<string | null>(null);

  useEffect(() => {
    const tagParams = searchParams.get('tags');
    if (tagParams) {
      setSelectedTags(tagParams.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean));
    }
    // URL params only seed initial state; later changes are handled by event handlers below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRecipes({ tags: selectedTags, query: recipeSearchQuery });
    loadCookbooks({ query: cookbookSearchQuery });
  }, [loadRecipes, loadCookbooks, selectedTags, recipeSearchQuery, cookbookSearchQuery]);

  const updateUrlParams = (query: string, tags: string[]) => {
    const nextParams = new URLSearchParams(searchParams);
    if (query.trim()) {
      nextParams.set('q', query.trim());
    } else {
      nextParams.delete('q');
    }

    if (tags.length > 0) {
      nextParams.set('tags', tags.join(','));
    } else {
      nextParams.delete('tags');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
    if (!user) {
      showToast({ message: 'Please sign in to save recipes', type: 'info' });
      return;
    }
    setSavingRecipeId(recipe.id);
    const savedId = await saveRecipe(recipe.id);
    setSavingRecipeId(null);

    if (savedId) {
      // Refresh the recipes list so it shows the new recipe
      await refreshRecipes();
      showToast({
        message: 'Saved to My Recipes',
        type: 'success',
        action: {
          label: 'View',
          onClick: () => navigate('/my-recipes', { replace: true }),
        },
      });
    } else {
      showToast({
        message: 'Could not save recipe. Please try again.',
        type: 'error',
      });
    }
  };

  const handleUnsaveRecipe = async (recipe: Recipe) => {
    if (!user) {
      showToast({ message: 'Please sign in to save recipes', type: 'info' });
      return;
    }
    setSavingRecipeId(recipe.id);
    const didUnsave = await unsaveRecipe(recipe.id);
    setSavingRecipeId(null);

    if (didUnsave) {
      await refreshRecipes();
      showToast({
        message: 'Removed from My Recipes',
        type: 'success',
      });
    } else {
      showToast({
        message: 'Could not remove recipe. Please try again.',
        type: 'error',
      });
    }
  };

  const handleToggleRecipeSave = async (recipe: Recipe) => {
    if (recipe.isSaved) {
      await handleUnsaveRecipe(recipe);
    } else {
      await handleSaveRecipe(recipe);
    }
  };

  const handleSaveCookbook = async (cookbook: Cookbook) => {
    if (!user) {
      showToast({ message: 'Please sign in to save cookbooks', type: 'info' });
      return;
    }
    setSavingCookbookId(cookbook.id);
    const savedId = await saveCookbook(cookbook.id);
    setSavingCookbookId(null);

    if (savedId) {
      void refreshCookbooks();
      showToast({
        message: 'Cookbook saved to your collection',
        type: 'success',
        action: {
          label: 'View',
          onClick: () => navigate('/cookbooks', { replace: true }),
        },
      });
    } else {
      showToast({
        message: 'Could not save cookbook. Please try again.',
        type: 'error',
      });
    }
  };

  const handleUnsaveCookbook = async (cookbook: Cookbook) => {
    if (!user) {
      showToast({ message: 'Please sign in to save cookbooks', type: 'info' });
      return;
    }
    setSavingCookbookId(cookbook.id);
    const didUnsave = await unsaveCookbook(cookbook.id);
    setSavingCookbookId(null);

    if (didUnsave) {
      void refreshCookbooks();
      showToast({
        message: 'Cookbook removed from your collection',
        type: 'success',
      });
    } else {
      showToast({
        message: 'Could not remove cookbook. Please try again.',
        type: 'error',
      });
    }
  };

  const handleToggleCookbookSave = async (cookbook: Cookbook) => {
    if (cookbook.isSaved) {
      await handleUnsaveCookbook(cookbook);
    } else {
      await handleSaveCookbook(cookbook);
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
      // Refresh the discovery page data
      loadRecipes({ tags: selectedTags, query: recipeSearchQuery });
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
      loadRecipes({ tags: selectedTags, query: recipeSearchQuery });
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  };

  const handleTagClick = (tag: string) => {
    const nextTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(nextTags);
    updateUrlParams(activeSearchQuery, nextTags);
  };

  const handleClearTags = () => {
    setSelectedTags([]);
    updateUrlParams(activeSearchQuery, []);
  };

  const handleLoadMoreRecipes = async () => {
    await loadMoreRecipes({ query: recipeSearchQuery });
  };

  const handleLoadMoreCookbooks = async () => {
    await loadMoreCookbooks({ query: cookbookSearchQuery });
  };

  const uniqueRecipes = useMemo(() => uniqueById(recipes), [recipes]);
  const uniqueCookbooks = useMemo(() => uniqueById(cookbooks), [cookbooks]);
  const requestedRecipeId = getRecipeDetailRouteId(searchParams);
  const normalizedRecipeSearchQuery = recipeSearchQuery.trim().toLowerCase();
  const normalizedCookbookSearchQuery = cookbookSearchQuery.trim().toLowerCase();
  const activeSearchQuery = tab === 'recipes' ? recipeSearchQuery : cookbookSearchQuery;
  const activeSearchPlaceholder = tab === 'recipes' ? 'Search recipes...' : 'Search cookbooks...';

  const handleSearchQueryChange = (value: string) => {
    if (tab === 'recipes') {
      setRecipeSearchQuery(value);
    } else {
      setCookbookSearchQuery(value);
    }
    updateUrlParams(value, selectedTags);
  };

  const filteredRecipes = normalizedRecipeSearchQuery
    ? uniqueRecipes.filter(r =>
        r.title.toLowerCase().includes(normalizedRecipeSearchQuery) ||
        r.description.toLowerCase().includes(normalizedRecipeSearchQuery) ||
        r.tags.some(tag => tag.toLowerCase().includes(normalizedRecipeSearchQuery))
      )
    : uniqueRecipes;

  const filteredCookbooks = normalizedCookbookSearchQuery
    ? uniqueCookbooks.filter(c =>
        c.name.toLowerCase().includes(normalizedCookbookSearchQuery) ||
        c.description?.toLowerCase().includes(normalizedCookbookSearchQuery)
      )
    : uniqueCookbooks;

  const hasMoreRecipes = uniqueRecipes.length < recipesTotal;
  const hasMoreCookbooks = uniqueCookbooks.length < cookbooksTotal;
  const activeCollectionLabel = tab === 'recipes' ? 'Community recipes' : 'Shared cookbooks';
  const activeCollectionDescription = tab === 'recipes'
    ? 'Fresh public recipes from cooks across Recipesaurus.'
    : 'Public cookbook collections curated by the community.';

  const { loadMoreRef: recipesLoadMoreRef } = useInfiniteScroll({
    onLoadMore: handleLoadMoreRecipes,
    hasMore: hasMoreRecipes,
    isLoading: isLoadingRecipes,
  });

  const { loadMoreRef: cookbooksLoadMoreRef } = useInfiniteScroll({
    onLoadMore: handleLoadMoreCookbooks,
    hasMore: hasMoreCookbooks,
    isLoading: isLoadingCookbooks,
  });
  const { swipeHandlers: discoverySwipeHandlers } = useSwipeActions<HTMLDivElement>({
    ignoreSelectors: ['.discovery-card', '.tag-btn', '.tag-clear', '.search-input-wrapper'],
    onSwipeLeft: tab === 'recipes' ? () => navigate('/discover/cookbooks', { replace: true }) : undefined,
  });

  useEffect(() => {
    if (tab !== 'recipes' || !requestedRecipeId) return;

    const recipe = uniqueRecipes.find(item => item.id === requestedRecipeId);
    if (recipe) {
      setSelectedRecipe(current => (current?.id === recipe.id ? current : recipe));
      return;
    }

    let isMounted = true;
    getPublicRecipe(requestedRecipeId).then(publicRecipe => {
      if (isMounted && publicRecipe) {
        setSelectedRecipe(current => (current?.id === publicRecipe.id ? current : publicRecipe));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [getPublicRecipe, requestedRecipeId, tab, uniqueRecipes]);

  return (
    <div className="discovery-page" {...discoverySwipeHandlers}>
      <section className="discovery-header discovery-hero" aria-labelledby="discover-heading">
        <div className="discovery-hero-copy">
          <span className="discovery-eyebrow">
            <Compass size={16} />
            Community Discover
          </span>
          <h1 id="discover-heading">
            <TrendingUp size={30} />
            Discover
          </h1>
          <p>Public recipes and cookbook collections from the Recipesaurus community.</p>
        </div>

        <div className="discovery-hero-stats" aria-label="Discover totals">
          <span className="discovery-stat">
            <ChefHat size={20} />
            <span>
              <strong>{recipesTotal.toLocaleString()}</strong>
              public recipes
            </span>
          </span>
          <span className="discovery-stat">
            <BookOpen size={20} />
            <span>
              <strong>{cookbooksTotal.toLocaleString()}</strong>
              shared cookbooks
            </span>
          </span>
        </div>
      </section>

      <div className="discovery-tools" aria-label="Discover filters">
        <div className="discovery-search">
          <div className="search-input-wrapper">
            <Search size={20} />
            <input
              type="text"
              placeholder={activeSearchPlaceholder}
              value={activeSearchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
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
            <button className="tag-clear" onClick={handleClearTags}>
              Clear
            </button>
          )}
        </div>

        <div className="discovery-tabs">
          <NavLink
            to="/discover/recipes"
            replace
            className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
          >
            <ChefHat size={18} />
            Recipes
            {recipesTotal > 0 && <span className="count">({recipesTotal})</span>}
          </NavLink>
          <NavLink
            to="/discover/cookbooks"
            replace
            className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
          >
            <BookOpen size={18} />
            Cookbooks
            {cookbooksTotal > 0 && <span className="count">({cookbooksTotal})</span>}
          </NavLink>
        </div>
      </div>

      {tab === 'recipes' && (
        <div className="discovery-content">
          <div className="discovery-section-heading">
            <div>
              <span className="discovery-section-kicker">Discover feed</span>
              <h2>{activeCollectionLabel}</h2>
            </div>
            <p>{activeCollectionDescription}</p>
          </div>

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
                    onToggleSave={() => handleToggleRecipeSave(recipe)}
                    onAuthorClick={recipe.ownerId ? () => navigate(`/profiles/${recipe.ownerId}`) : undefined}
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

      {tab === 'cookbooks' && (
        <div className="discovery-content">
          <div className="discovery-section-heading">
            <div>
              <span className="discovery-section-kicker">Discover feed</span>
              <h2>{activeCollectionLabel}</h2>
            </div>
            <p>{activeCollectionDescription}</p>
          </div>

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
                    onClick={() => navigate(`/discover/cookbooks/${cookbook.id}`)}
                    onToggleSave={() => handleToggleCookbookSave(cookbook)}
                    onAuthorClick={cookbook.ownerId ? () => navigate(`/profiles/${cookbook.ownerId}`) : undefined}
                    isSaving={savingCookbookId === cookbook.id}
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
          isSaving={savingRecipeId === selectedRecipe.id}
          isSaved={Boolean(selectedRecipe.isSaved)}
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
