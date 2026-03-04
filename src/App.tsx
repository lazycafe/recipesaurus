import { useState, useMemo, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RecipeProvider, useRecipes } from './context/RecipeContext';
import { CookbookProvider, useCookbooks } from './context/CookbookContext';
import { Header } from './components/Header';
import { SearchFilter } from './components/SearchFilter';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetail } from './components/RecipeDetail';
import { AddRecipeModal } from './components/AddRecipeModal';
import { AuthModal } from './components/AuthModal';
import { EmptyState } from './components/EmptyState';
import { DinoMascot } from './components/DinoMascot';
import { CookbookList } from './components/CookbookList';
import { CookbookModal } from './components/CookbookModal';
import { CookbookDetail } from './components/CookbookDetail';
import { ShareCookbookModal } from './components/ShareCookbookModal';
import { AddToCookbookModal } from './components/AddToCookbookModal';
import { SharedCookbookView } from './components/SharedCookbookView';
import { Recipe, RecipeFormData } from './types/Recipe';
import { Cookbook } from './types/Cookbook';
import { Loader2 } from 'lucide-react';
import './App.css';

function LandingPage({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  return (
    <div className="landing">
      <div className="landing-content">
        <DinoMascot size={120} className="landing-mascot" />
        <h1>Recipesaurus</h1>
        <p>Your personal recipe collection, beautifully organized.</p>
        <div className="landing-actions">
          <button className="btn-primary btn-lg" onClick={onRegister}>
            Get Started
          </button>
          <button className="btn-secondary btn-lg" onClick={onLogin}>
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <Loader2 size={32} className="spin" />
    </div>
  );
}

function RecipeApp() {
  const { recipes, isLoading, addRecipe, deleteRecipe, getAllTags } = useRecipes();
  const { createCookbook, removeRecipeFromCookbook } = useCookbooks();
  const [currentView, setCurrentView] = useState<'recipes' | 'cookbooks'>('recipes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCookbookModal, setShowCookbookModal] = useState(false);
  const [selectedCookbook, setSelectedCookbook] = useState<Cookbook | null>(null);
  const [editingCookbook, setEditingCookbook] = useState<Cookbook | null>(null);
  const [sharingCookbook, setSharingCookbook] = useState<Cookbook | null>(null);
  const [addToCookbookRecipe, setAddToCookbookRecipe] = useState<Recipe | null>(null);

  const allTags = getAllTags();

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

  const handleAddRecipe = async (formData: RecipeFormData) => {
    try {
      await addRecipe({
        title: formData.title.trim(),
        description: formData.description.trim(),
        ingredients: formData.ingredients
          .split('\n')
          .map(i => i.trim())
          .filter(Boolean),
        instructions: formData.instructions
          .split('\n')
          .map(i => i.trim())
          .filter(Boolean),
        tags: formData.tags
          .split(',')
          .map(t => t.trim().toLowerCase())
          .filter(Boolean),
        imageUrl: formData.imageUrl.trim() || undefined,
        prepTime: formData.prepTime.trim() || undefined,
        cookTime: formData.cookTime.trim() || undefined,
        servings: formData.servings.trim() || undefined,
      });
    } catch (error) {
      console.error('Failed to add recipe:', error);
    }
  };

  const handleUrlImport = async (url: string) => {
    try {
      await addRecipe({
        title: 'Imported Recipe',
        description: 'Recipe imported from: ' + url,
        ingredients: ['Ingredient 1', 'Ingredient 2', 'Ingredient 3'],
        instructions: ['Step 1', 'Step 2', 'Step 3'],
        tags: ['imported'],
        sourceUrl: url,
      });
    } catch (error) {
      console.error('Failed to import recipe:', error);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      await deleteRecipe(id);
      if (selectedRecipe?.id === id) {
        setSelectedRecipe(null);
      }
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  };

  const handleCreateCookbook = async (name: string, description?: string) => {
    await createCookbook(name, description);
  };

  const hasFilters = searchQuery.length > 0 || selectedTags.length > 0;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        onAddRecipe={() => setShowAddModal(true)}
        onAddCookbook={() => setShowCookbookModal(true)}
      />

      <main className="main">
        <div className="container">
          {currentView === 'recipes' ? (
            <>
              <SearchFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedTags={selectedTags}
                onTagToggle={handleTagToggle}
                allTags={allTags}
                onClearFilters={handleClearFilters}
              />

              {filteredRecipes.length > 0 ? (
                <>
                  <p className="results-count">
                    {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}
                    {hasFilters && ` of ${recipes.length}`}
                  </p>
                  <div className="recipe-grid">
                    {filteredRecipes.map(recipe => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        onClick={() => setSelectedRecipe(recipe)}
                        onDelete={() => handleDeleteRecipe(recipe.id)}
                        onAddToCookbook={() => setAddToCookbookRecipe(recipe)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  hasFilters={hasFilters}
                  onAddRecipe={() => setShowAddModal(true)}
                  onClearFilters={handleClearFilters}
                />
              )}
            </>
          ) : (
            <CookbookList
              onCreateCookbook={() => setShowCookbookModal(true)}
              onSelectCookbook={setSelectedCookbook}
            />
          )}
        </div>
      </main>

      <footer className="footer">
        <p>Recipesaurus</p>
      </footer>

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onDelete={() => handleDeleteRecipe(selectedRecipe.id)}
        />
      )}

      {showAddModal && (
        <AddRecipeModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddRecipe}
          onUrlSubmit={handleUrlImport}
        />
      )}

      {showCookbookModal && (
        <CookbookModal
          cookbook={editingCookbook || undefined}
          onClose={() => {
            setShowCookbookModal(false);
            setEditingCookbook(null);
          }}
          onSubmit={handleCreateCookbook}
        />
      )}

      {selectedCookbook && (
        <CookbookDetail
          cookbook={selectedCookbook}
          onClose={() => setSelectedCookbook(null)}
          onEdit={() => {
            setEditingCookbook(selectedCookbook);
            setShowCookbookModal(true);
          }}
          onShare={() => setSharingCookbook(selectedCookbook)}
          onViewRecipe={setSelectedRecipe}
          onRemoveRecipe={(recipeId) => removeRecipeFromCookbook(selectedCookbook.id, recipeId)}
        />
      )}

      {sharingCookbook && (
        <ShareCookbookModal
          cookbook={sharingCookbook}
          onClose={() => setSharingCookbook(null)}
        />
      )}

      {addToCookbookRecipe && (
        <AddToCookbookModal
          recipe={addToCookbookRecipe}
          onClose={() => setAddToCookbookRecipe(null)}
          onCreateCookbook={() => setShowCookbookModal(true)}
        />
      )}
    </>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [sharedToken, setSharedToken] = useState<string | null>(null);

  // Check for shared cookbook URL on mount
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/shared\/([a-f0-9]+)$/);
    if (match) {
      setSharedToken(match[1]);
    }
  }, []);

  // Handle shared cookbook view
  if (sharedToken) {
    return <SharedCookbookView token={sharedToken} />;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <>
        <LandingPage
          onLogin={() => setAuthModal('login')}
          onRegister={() => setAuthModal('register')}
        />
        {authModal && (
          <AuthModal
            initialMode={authModal}
            onClose={() => setAuthModal(null)}
          />
        )}
      </>
    );
  }

  return (
    <RecipeProvider>
      <CookbookProvider>
        <RecipeApp />
      </CookbookProvider>
    </RecipeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <AppContent />
      </div>
    </AuthProvider>
  );
}

export default App;
