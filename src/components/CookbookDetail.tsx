import { useState, useEffect, useMemo } from 'react';
import { X, Share2, Pencil, Loader2, User, Trash2, Search, ArrowLeft, Check, LogOut } from 'lucide-react';
import { Cookbook } from '../types/Cookbook';
import { Recipe } from '../types/Recipe';
import { cookbooksApi, RecipeResponse } from '../utils/api';
import { RecipeCard } from './RecipeCard';
import { DinoMascot } from './DinoMascot';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { ModalOverlay } from './ModalOverlay';

interface CookbookDetailProps {
  cookbook: Cookbook;
  onClose: () => void;
  onEdit: () => void;
  onShare: () => void;
  onRemoveRecipe: (recipeId: string) => void;
  onLeave?: () => void;
}

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

export function CookbookDetail({
  cookbook,
  onClose,
  onEdit,
  onShare,
  onRemoveRecipe,
  onLeave,
}: CookbookDetailProps) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<CookbookRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<CookbookRecipe | null>(null);
  const [recipeToRemove, setRecipeToRemove] = useState<CookbookRecipe | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Check if user can remove a recipe (owner can remove any, shared users can only remove their own)
  const canRemoveRecipe = (recipe: CookbookRecipe) => {
    if (cookbook.isOwner) return true;
    return recipe.addedByUserId === user?.id;
  };

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

  // Get all unique tags from recipes in this cookbook
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    recipes.forEach(recipe => {
      recipe.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [recipes]);

  // Filter recipes based on search and tags
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

  const confirmRemoveRecipe = () => {
    if (recipeToRemove) {
      setRecipes(prev => prev.filter(r => r.id !== recipeToRemove.id));
      onRemoveRecipe(recipeToRemove.id);
      setRecipeToRemove(null);
    }
  };

  const hasFilters = searchQuery.length > 0 || selectedTags.length > 0;

  // If a recipe is selected, show the recipe detail view
  if (selectedRecipe) {
    return (
      <ModalOverlay onClose={() => setSelectedRecipe(null)} className="cookbook-detail-overlay">
        <div className="cookbook-detail cookbook-recipe-view">
          <div className="cookbook-recipe-header">
            <button className="btn-back" onClick={() => setSelectedRecipe(null)}>
              <ArrowLeft size={18} />
              <span>Back to {cookbook.name}</span>
            </button>
            <button className="modal-close" onClick={onClose}>
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          <div className="cookbook-recipe-content">
            <div className="detail-header">
              <div className="detail-image">
                {selectedRecipe.imageUrl ? (
                  <img src={selectedRecipe.imageUrl} alt={selectedRecipe.title} />
                ) : (
                  <div className="detail-image-placeholder">
                    <DinoMascot size={80} />
                  </div>
                )}
              </div>
              <div className="detail-info">
                <h2 className="detail-title">{selectedRecipe.title}</h2>
                {selectedRecipe.description && (
                  <p className="detail-description">{selectedRecipe.description}</p>
                )}

                {(selectedRecipe.prepTime || selectedRecipe.cookTime || selectedRecipe.servings) && (
                  <div className="detail-meta">
                    {selectedRecipe.prepTime && (
                      <div className="meta-block">
                        <div>
                          <span className="meta-label">Prep</span>
                          <span className="meta-value">{selectedRecipe.prepTime}</span>
                        </div>
                      </div>
                    )}
                    {selectedRecipe.cookTime && (
                      <div className="meta-block">
                        <div>
                          <span className="meta-label">Cook</span>
                          <span className="meta-value">{selectedRecipe.cookTime}</span>
                        </div>
                      </div>
                    )}
                    {selectedRecipe.servings && (
                      <div className="meta-block">
                        <div>
                          <span className="meta-label">Serves</span>
                          <span className="meta-value">{selectedRecipe.servings}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedRecipe.tags.length > 0 && (
                  <div className="detail-tags">
                    {selectedRecipe.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="detail-body">
              <div className="detail-section">
                <h3>Ingredients</h3>
                <ul className="ingredients-list">
                  {selectedRecipe.ingredients.map((ingredient, idx) => (
                    <li key={idx}>
                      <input type="checkbox" id={`ing-${idx}`} />
                      <label htmlFor={`ing-${idx}`}>{ingredient}</label>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="detail-section">
                <h3>Instructions</h3>
                <ol className="instructions-list">
                  {selectedRecipe.instructions.map((instruction, idx) => (
                    <li key={idx}>{instruction}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay onClose={onClose} className="cookbook-detail-overlay">
      <div className="cookbook-detail">
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

          <div className="cookbook-detail-actions">
            {cookbook.isOwner ? (
              <>
                <button className="btn-secondary" onClick={onEdit}>
                  <Pencil size={16} />
                  Edit
                </button>
                <button className="btn-primary" onClick={onShare}>
                  <Share2 size={16} />
                  Share
                </button>
              </>
            ) : onLeave && (
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(true)}>
                <LogOut size={16} />
                Leave
              </button>
            )}
            <button className="btn-icon" onClick={onClose} aria-label="Close">
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="cookbook-detail-content">
          {isLoading ? (
            <div className="loading-state">
              <Loader2 size={32} className="spin" />
            </div>
          ) : recipes.length > 0 ? (
            <>
              {/* Search and Filter */}
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

        {showDeleteConfirm && !cookbook.isOwner && (
          <ConfirmModal
            title="Leave Cookbook"
            message={`Are you sure you want to leave "${cookbook.name}"? You'll no longer have access to this cookbook.`}
            confirmText="Leave"
            onConfirm={() => {
              setShowDeleteConfirm(false);
              onClose();
              onLeave?.();
            }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </div>
    </ModalOverlay>
  );
}
