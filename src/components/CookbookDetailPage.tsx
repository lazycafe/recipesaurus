import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Share2, Pencil, Loader2, User, Trash2, Search, ArrowLeft, Check, LogOut, X } from 'lucide-react';
import { Cookbook } from '../types/Cookbook';
import { Recipe } from '../types/Recipe';
import { cookbooksApi, RecipeResponse, CookbookResponse } from '../utils/api';
import { RecipeCard } from './RecipeCard';
import { DinoMascot } from './DinoMascot';
import { ConfirmModal } from './ConfirmModal';
import { RecipeDetail } from './RecipeDetail';
import { CookbookModal } from './CookbookModal';
import { ShareCookbookModal } from './ShareCookbookModal';
import { useAuth } from '../context/AuthContext';
import { useCookbooks } from '../context/CookbookContext';
import { ModalOverlay } from './ModalOverlay';

interface CookbookRecipe extends Recipe {
  addedByUserId?: string;
  addedByUserName?: string | null;
}

function mapRecipeResponse(r: RecipeResponse): CookbookRecipe {
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
    addedByUserId: r.addedByUserId,
    addedByUserName: r.addedByUserName,
  };
}

function mapCookbookResponse(c: CookbookResponse): Cookbook {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    coverImage: c.coverImage,
    recipeCount: c.recipeCount,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    isOwner: c.isOwner,
    ownerName: c.ownerName,
  };
}

export function CookbookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateCookbook, deleteCookbook, leaveCookbook, removeRecipeFromCookbook } = useCookbooks();

  const [cookbook, setCookbook] = useState<Cookbook | null>(null);
  const [recipes, setRecipes] = useState<CookbookRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<CookbookRecipe | null>(null);
  const [recipeToRemove, setRecipeToRemove] = useState<CookbookRecipe | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const canRemoveRecipe = (recipe: CookbookRecipe) => {
    if (cookbook?.isOwner) return true;
    return recipe.addedByUserId === user?.id;
  };

  useEffect(() => {
    async function fetchCookbook() {
      if (!id) return;

      setIsLoading(true);
      setError(null);

      const { data, error } = await cookbooksApi.get(id);
      if (error || !data) {
        setError('Cookbook not found');
        setIsLoading(false);
        return;
      }

      setCookbook(mapCookbookResponse(data.cookbook));
      setRecipes(data.recipes.map(mapRecipeResponse));
      setIsLoading(false);
    }
    fetchCookbook();
  }, [id]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    recipes.forEach(recipe => {
      recipe.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        recipe.title.toLowerCase().includes(searchLower) ||
        recipe.description.toLowerCase().includes(searchLower) ||
        recipe.ingredients.some(i => i.toLowerCase().includes(searchLower)) ||
        recipe.tags.some(t => t.toLowerCase().includes(searchLower));

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every(tag => recipe.tags.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [recipes, searchQuery, selectedTags]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  const handleRemoveRecipe = (recipe: CookbookRecipe) => {
    setRecipeToRemove(recipe);
  };

  const confirmRemoveRecipe = async () => {
    if (recipeToRemove && cookbook) {
      setRecipes(prev => prev.filter(r => r.id !== recipeToRemove.id));
      await removeRecipeFromCookbook(cookbook.id, recipeToRemove.id);
      setRecipeToRemove(null);
    }
  };

  const handleSaveCookbook = async (data: { name: string; description?: string; coverImage?: string; isPublic?: boolean }) => {
    if (cookbook) {
      await updateCookbook(cookbook.id, data);
      setCookbook({ ...cookbook, ...data });
      setShowEditModal(false);
    }
  };

  const handleDeleteCookbook = async () => {
    if (cookbook) {
      await deleteCookbook(cookbook.id);
      navigate('/cookbooks');
    }
  };

  const handleLeaveCookbook = async () => {
    if (cookbook) {
      await leaveCookbook(cookbook.id);
      navigate('/cookbooks');
    }
  };

  const hasFilters = searchQuery.length > 0 || selectedTags.length > 0;

  if (isLoading) {
    return (
      <div className="cookbook-detail-page">
        <div className="loading-state">
          <Loader2 size={32} className="spin" />
        </div>
      </div>
    );
  }

  if (error || !cookbook) {
    return (
      <div className="cookbook-detail-page">
        <div className="empty-state">
          <DinoMascot size={80} />
          <h3>Cookbook not found</h3>
          <p>This cookbook may have been deleted or you don't have access to it.</p>
          <Link to="/cookbooks" className="btn-primary">
            <ArrowLeft size={16} />
            Back to Cookbooks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cookbook-detail-page">
      <Link to="/cookbooks" className="back-link">
        <ArrowLeft size={18} />
        Back to Cookbooks
      </Link>

      <div className="cookbook-detail-header">
        <div className="cookbook-detail-info">
          <h1>{cookbook.name}</h1>
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

        <div className="cookbook-detail-actions">
          {cookbook.isOwner ? (
            <>
              <button className="btn-secondary" onClick={() => setShowEditModal(true)}>
                <Pencil size={16} />
                Edit
              </button>
              <button className="btn-primary" onClick={() => setShowShareModal(true)}>
                <Share2 size={16} />
                Share
              </button>
            </>
          ) : (
            <button className="btn-secondary" onClick={() => setShowLeaveConfirm(true)}>
              <LogOut size={16} />
              Leave
            </button>
          )}
        </div>
      </div>

      <div className="cookbook-detail-content">
        {recipes.length > 0 ? (
          <>
            <div className="cookbook-search-filter">
              <div className="cookbook-search-bar">
                <Search size={18} strokeWidth={2} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search in cookbook..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {hasFilters && (
                  <button className="btn-clear" onClick={handleClearFilters}>
                    <X size={16} strokeWidth={2} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {allTags.length > 0 && (
                <div className="cookbook-filter-tags">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      className={`filter-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {selectedTags.includes(tag) && <Check size={12} strokeWidth={3} />}
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className="results-count">
              {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}
              {hasFilters && ` of ${recipes.length}`}
            </p>

            {filteredRecipes.length > 0 ? (
              <div className="recipe-grid">
                {filteredRecipes.map(recipe => (
                  <div key={recipe.id} className="cookbook-recipe-card">
                    <RecipeCard
                      recipe={recipe}
                      onClick={() => setSelectedRecipe(recipe)}
                    />
                    {recipe.addedByUserName && (
                      <div className="recipe-added-by">
                        <User size={12} />
                        <span>Added by {recipe.addedByUserName}</span>
                      </div>
                    )}
                    {canRemoveRecipe(recipe) && (
                      <button
                        className="remove-from-cookbook"
                        onClick={() => handleRemoveRecipe(recipe)}
                        title="Remove from cookbook"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <DinoMascot size={80} />
                <h3>No matches found</h3>
                <p>Try adjusting your search or filters</p>
                <button className="btn-secondary" onClick={handleClearFilters}>
                  <Search size={16} strokeWidth={2} />
                  <span>Clear Filters</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <DinoMascot size={80} />
            <h3>No recipes yet</h3>
            <p>Add recipes to this cookbook from your recipe collection.</p>
          </div>
        )}
      </div>

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

      {recipeToRemove && (
        <ModalOverlay onClose={() => setRecipeToRemove(null)} className="confirm-modal-overlay">
          <div className="confirm-modal">
            <h3>Remove Recipe</h3>
            <p>Remove <strong>{recipeToRemove.title}</strong> from this cookbook?</p>
            <div className="confirm-modal-actions">
              <button className="btn-secondary" onClick={() => setRecipeToRemove(null)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmRemoveRecipe}>
                <Trash2 size={16} />
                Remove
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {showLeaveConfirm && !cookbook.isOwner && (
        <ConfirmModal
          title="Leave Cookbook"
          message={`Are you sure you want to leave "${cookbook.name}"? You'll no longer have access to this cookbook.`}
          confirmText="Leave"
          onConfirm={handleLeaveCookbook}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}

      {showEditModal && (
        <CookbookModal
          cookbook={cookbook}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleSaveCookbook}
          onDelete={handleDeleteCookbook}
        />
      )}

      {showShareModal && (
        <ShareCookbookModal
          cookbook={cookbook}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
