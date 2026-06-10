import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useRecipes } from '../context/RecipeContext';
import { RecipeCard } from './RecipeCard';
import { RecipeDetail } from './RecipeDetail';
import { AddRecipeModal } from './AddRecipeModal';
import { ConfirmModal } from './ConfirmModal';
import { AddToCookbookModal } from './AddToCookbookModal';
import { CookbookModal } from './CookbookModal';
import { DinoMascot } from './DinoMascot';
import { useSwipeActions } from '../hooks/useSwipeActions';
import { useCookbooks } from '../context/CookbookContext';
import { Recipe, RecipeFormData } from '../types/Recipe';
import { dedupeRecipes } from '../utils/recipeDedupe';

interface ExtendedRecipe extends Recipe {
  ownerName?: string;
  isOwner?: boolean;
}

const RECIPES_PER_PAGE = 10;

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

export function MyRecipesPage() {
  const { recipes, isLoading, addRecipe, updateRecipe, deleteRecipe, getAllTags } = useRecipes();
  const { createCookbook } = useCookbooks();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<ExtendedRecipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<ExtendedRecipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<ExtendedRecipe | null>(null);
  const [addToCookbookRecipe, setAddToCookbookRecipe] = useState<ExtendedRecipe | null>(null);
  const [showCreateCookbookModal, setShowCreateCookbookModal] = useState(false);
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const filterMenuRef = useRef<HTMLDivElement>(null);
  const uniqueRecipes = useMemo(() => dedupeRecipes(recipes), [recipes]);

  // Close filter menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allTags = getAllTags();

  // Get unique owners from recipes
  const allOwners = useMemo(() => {
    const ownerSet = new Map<string, string>();
    uniqueRecipes.forEach(recipe => {
      const r = recipe as ExtendedRecipe;
      if (r.ownerName) {
        ownerSet.set(r.ownerName, r.ownerName);
      }
    });
    return Array.from(ownerSet.values()).sort();
  }, [uniqueRecipes]);

  const filteredRecipes = useMemo<ExtendedRecipe[]>(() => {
    return uniqueRecipes.filter(recipe => {
      const r = recipe as ExtendedRecipe;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        r.title.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower) ||
        r.ingredients.some(i => i.toLowerCase().includes(searchLower)) ||
        r.tags.some(t => t.toLowerCase().includes(searchLower));

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every(tag => r.tags.includes(tag));

      const matchesOwner =
        !selectedOwner ||
        r.ownerName === selectedOwner;

      return matchesSearch && matchesTags && matchesOwner;
    }) as ExtendedRecipe[];
  }, [uniqueRecipes, searchQuery, selectedTags, selectedOwner]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedOwner(null);
  };

  const handleUpdateRecipe = async (formData: RecipeFormData) => {
    if (!editingRecipe) return;
    try {
      await updateRecipe(editingRecipe.id, parseFormData(formData));
      setEditingRecipe(null);
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
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  };

  const handleAddRecipe = async (formData: RecipeFormData) => {
    try {
      await addRecipe(parseFormData(formData));
      setShowAddRecipeModal(false);
    } catch (error) {
      console.error('Failed to add recipe:', error);
    }
  };

  const hasFilters = searchQuery.length > 0 || selectedTags.length > 0 || selectedOwner !== null;
  const activeFilterCount = selectedTags.length + (selectedOwner ? 1 : 0);
  const pageCount = Math.max(1, Math.ceil(filteredRecipes.length / RECIPES_PER_PAGE));
  const paginatedRecipes = filteredRecipes.slice(
    (currentPage - 1) * RECIPES_PER_PAGE,
    currentPage * RECIPES_PER_PAGE
  );
  const { swipeHandlers: paginationSwipeHandlers } = useSwipeActions<HTMLElement>({
    enabled: pageCount > 1,
    onSwipeLeft: currentPage < pageCount
      ? () => setCurrentPage(page => Math.min(pageCount, page + 1))
      : undefined,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTags, selectedOwner]);

  useEffect(() => {
    setCurrentPage(prev => Math.min(prev, pageCount));
  }, [pageCount]);

  if (isLoading) {
    return (
      <div className="my-recipes-page">
        <div className="loading-state">
          <Loader2 size={32} className="spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="my-recipes-page">
      <div className="page-header">
        <div className="page-header-title">
          <h1>My Recipes</h1>
          <p className="page-subtitle">Your saved, created, and shared recipes for everyday meal planning</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddRecipeModal(true)}>
          <Plus size={18} strokeWidth={2.5} />
          <span>New Recipe</span>
        </button>
      </div>

      {uniqueRecipes.length > 0 ? (
        <>
          <div className="my-recipes-toolbar">
            <div className="my-recipes-search-bar">
              <Search size={18} strokeWidth={2} className="search-icon" />
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button className="btn-clear-input" onClick={() => setSearchQuery('')}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="filter-container" ref={filterMenuRef}>
              <button
                className={`btn-filter ${activeFilterCount > 0 ? 'active' : ''}`}
                onClick={() => setShowFilterMenu(!showFilterMenu)}
              >
                <Filter size={18} />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="filter-badge">{activeFilterCount}</span>
                )}
              </button>

              {showFilterMenu && (
                <div className="filter-menu">
                  <div className="filter-menu-header">
                    <h3>Filters</h3>
                    {hasFilters && (
                      <button className="btn-clear-filters" onClick={handleClearFilters}>
                        Clear all
                      </button>
                    )}
                  </div>

                  {allTags.length > 0 && (
                    <div className="filter-section">
                      <h4>Tags</h4>
                      <div className="filter-tags">
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
                    </div>
                  )}

                  {allOwners.length > 0 && (
                    <div className="filter-section">
                      <h4>Owner</h4>
                      <div className="filter-owners">
                        {allOwners.map(owner => (
                          <button
                            key={owner}
                            className={`filter-owner ${selectedOwner === owner ? 'active' : ''}`}
                            onClick={() => setSelectedOwner(selectedOwner === owner ? null : owner)}
                          >
                            {selectedOwner === owner && <Check size={12} strokeWidth={3} />}
                            <span>{owner}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {filteredRecipes.length > 0 ? (
            <>
              <div className="recipe-grid my-recipes-grid">
                {paginatedRecipes.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onClick={() => setSelectedRecipe(recipe)}
                    onDelete={recipe.isOwner !== false ? () => setRecipeToDelete(recipe) : undefined}
                    onAddToCookbook={() => setAddToCookbookRecipe(recipe)}
                  />
                ))}
              </div>

              {pageCount > 1 && (
                <nav
                  className="recipe-pagination swipe-pagination"
                  aria-label="My recipes pagination"
                  {...paginationSwipeHandlers}
                >
                  <span className="pagination-status">Page {currentPage} of {pageCount}</span>
                  <div className="pagination-buttons">
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: pageCount }, (_, index) => index + 1).map(page => (
                      <button
                        key={page}
                        className={`pagination-page ${page === currentPage ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                        aria-label={`Page ${page}`}
                        aria-current={page === currentPage ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(page => Math.min(pageCount, page + 1))}
                      disabled={currentPage === pageCount}
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </nav>
              )}
            </>
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
          <p>Save recipes from Discover, collect shared favorites, or create your own.</p>
          <button className="btn-primary" onClick={() => setShowAddRecipeModal(true)}>
            <Plus size={18} strokeWidth={2.5} />
            <span>New Recipe</span>
          </button>
        </div>
      )}

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onEdit={selectedRecipe.isOwner !== false ? () => {
            setEditingRecipe(selectedRecipe);
            setSelectedRecipe(null);
          } : undefined}
          onDelete={selectedRecipe.isOwner !== false ? () => {
            setRecipeToDelete(selectedRecipe);
          } : undefined}
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
          }}
          onClose={() => setEditingRecipe(null)}
          onSubmit={handleUpdateRecipe}
        />
      )}

      {recipeToDelete && (
        <ConfirmModal
          title="Delete Recipe"
          message={`Are you sure you want to delete "${recipeToDelete.title}"? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={handleDeleteRecipe}
          onCancel={() => setRecipeToDelete(null)}
        />
      )}

      {addToCookbookRecipe && (
        <AddToCookbookModal
          recipe={addToCookbookRecipe}
          onClose={() => setAddToCookbookRecipe(null)}
          onCreateCookbook={() => {
            setAddToCookbookRecipe(null);
            setShowCreateCookbookModal(true);
          }}
        />
      )}

      {showCreateCookbookModal && (
        <CookbookModal
          onClose={() => setShowCreateCookbookModal(false)}
          onSubmit={async (data) => {
            const cookbookId = await createCookbook({
              ...data,
              coverImage: data.coverImage ?? undefined,
            });
            if (!cookbookId) {
              throw new Error('Failed to save cookbook. Please try again.');
            }
            setShowCreateCookbookModal(false);
          }}
        />
      )}

      {showAddRecipeModal && (
        <AddRecipeModal
          onClose={() => setShowAddRecipeModal(false)}
          onSubmit={handleAddRecipe}
        />
      )}
    </div>
  );
}
