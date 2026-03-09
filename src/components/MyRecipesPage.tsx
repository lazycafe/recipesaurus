import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, X, Check, Loader2, Plus } from 'lucide-react';
import { useRecipes } from '../context/RecipeContext';
import { RecipeCard } from './RecipeCard';
import { RecipeDetail } from './RecipeDetail';
import { AddRecipeModal } from './AddRecipeModal';
import { ConfirmModal } from './ConfirmModal';
import { AddToCookbookModal } from './AddToCookbookModal';
import { CookbookModal } from './CookbookModal';
import { DinoMascot } from './DinoMascot';
import { useCookbooks } from '../context/CookbookContext';
import { Recipe, RecipeFormData } from '../types/Recipe';

interface ExtendedRecipe extends Recipe {
  ownerName?: string;
  isOwner?: boolean;
}

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

  const filterMenuRef = useRef<HTMLDivElement>(null);

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
    recipes.forEach(recipe => {
      const r = recipe as ExtendedRecipe;
      if (r.ownerName) {
        ownerSet.set(r.ownerName, r.ownerName);
      }
    });
    return Array.from(ownerSet.values()).sort();
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
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
    });
  }, [recipes, searchQuery, selectedTags, selectedOwner]);

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
          <p className="page-subtitle">All recipes you've saved or created</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddRecipeModal(true)}>
          <Plus size={18} strokeWidth={2.5} />
          <span>New Recipe</span>
        </button>
      </div>

      {recipes.length > 0 ? (
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

          <p className="results-count">
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}
            {hasFilters && ` of ${recipes.length}`}
          </p>

          {filteredRecipes.length > 0 ? (
            <div className="recipe-grid">
              {filteredRecipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => setSelectedRecipe(recipe as ExtendedRecipe)}
                  onDelete={(recipe as ExtendedRecipe).isOwner !== false ? () => setRecipeToDelete(recipe as ExtendedRecipe) : undefined}
                  onAddToCookbook={() => setAddToCookbookRecipe(recipe as ExtendedRecipe)}
                />
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
          <p>Save recipes from Discover or create your own!</p>
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
            await createCookbook(data);
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
