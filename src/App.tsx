import { useState, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ClientProvider } from './client/ClientContext';
import { defaultClient } from './client/defaultClient';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RecipeProvider, useRecipes } from './context/RecipeContext';
import { CookbookProvider, useCookbooks } from './context/CookbookContext';
import { NotificationProvider } from './context/NotificationContext';
import { Header } from './components/Header';
import { SearchFilter } from './components/SearchFilter';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetail } from './components/RecipeDetail';
import { AddRecipeModal } from './components/AddRecipeModal';
import { AuthModal } from './components/AuthModal';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { EmptyState } from './components/EmptyState';
import { DinoMascot } from './components/DinoMascot';
import { CookbookList } from './components/CookbookList';
import { CookbookModal } from './components/CookbookModal';
import { CookbookDetail } from './components/CookbookDetail';
import { ShareCookbookModal } from './components/ShareCookbookModal';
import { AddToCookbookModal } from './components/AddToCookbookModal';
import { SharedCookbookView } from './components/SharedCookbookView';
import { SettingsPage } from './components/SettingsPage';
import { Recipe, RecipeFormData } from './types/Recipe';
import { Cookbook } from './types/Cookbook';
import { Loader2, ChefHat } from 'lucide-react';
import './App.css';

const parseFormData = (formData: RecipeFormData) => ({
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
  sourceUrl: formData.sourceUrl.trim() || undefined,
});

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

function RecipesView({
  onSelectRecipe,
  onAddRecipe,
  onAddToCookbook,
  onDeleteRecipe,
}: {
  onSelectRecipe: (recipe: Recipe) => void;
  onAddRecipe: () => void;
  onAddToCookbook: (recipe: Recipe) => void;
  onDeleteRecipe: (id: string) => void;
}) {
  const { recipes, isLoading, getAllTags } = useRecipes();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  const hasFilters = searchQuery.length > 0 || selectedTags.length > 0;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
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
                onClick={() => onSelectRecipe(recipe)}
                onDelete={() => onDeleteRecipe(recipe.id)}
                onAddToCookbook={() => onAddToCookbook(recipe)}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          hasFilters={hasFilters}
          onAddRecipe={onAddRecipe}
          onClearFilters={handleClearFilters}
        />
      )}
    </>
  );
}

function CookbooksView({
  onCreateCookbook,
  onSelectCookbook,
}: {
  onCreateCookbook: () => void;
  onSelectCookbook: (cookbook: Cookbook) => void;
}) {
  return (
    <CookbookList
      onCreateCookbook={onCreateCookbook}
      onSelectCookbook={onSelectCookbook}
    />
  );
}

function RecipeApp() {
  const { addRecipe, updateRecipe, deleteRecipe } = useRecipes();
  const { createCookbook, updateCookbook, deleteCookbook, leaveCookbook, removeRecipeFromCookbook } = useCookbooks();
  const location = useLocation();

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCookbookModal, setShowCookbookModal] = useState(false);
  const [selectedCookbook, setSelectedCookbook] = useState<Cookbook | null>(null);
  const [editingCookbook, setEditingCookbook] = useState<Cookbook | null>(null);
  const [sharingCookbook, setSharingCookbook] = useState<Cookbook | null>(null);
  const [addToCookbookRecipe, setAddToCookbookRecipe] = useState<Recipe | null>(null);

  const currentView = location.pathname === '/cookbooks' ? 'cookbooks' : 'recipes';

  const handleAddRecipe = async (formData: RecipeFormData) => {
    try {
      await addRecipe(parseFormData(formData));
    } catch (error) {
      console.error('Failed to add recipe:', error);
    }
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

  const handleSaveCookbook = async (name: string, description?: string, coverImage?: string) => {
    if (editingCookbook) {
      await updateCookbook(editingCookbook.id, { name, description, coverImage });
    } else {
      await createCookbook(name, description, coverImage);
    }
  };

  return (
    <>
      <Header
        currentView={currentView}
        onAddRecipe={() => setShowAddModal(true)}
        onAddCookbook={() => setShowCookbookModal(true)}
      />

      <main className="main">
        <div className="container">
          <Routes>
            <Route
              path="/"
              element={
                <RecipesView
                  onSelectRecipe={setSelectedRecipe}
                  onAddRecipe={() => setShowAddModal(true)}
                  onAddToCookbook={setAddToCookbookRecipe}
                  onDeleteRecipe={handleDeleteRecipe}
                />
              }
            />
            <Route
              path="/recipes"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/cookbooks"
              element={
                <CookbooksView
                  onCreateCookbook={() => setShowCookbookModal(true)}
                  onSelectCookbook={setSelectedCookbook}
                />
              }
            />
            <Route
              path="/settings"
              element={<SettingsPage />}
            />
          </Routes>
        </div>
      </main>

      <footer className="footer">
        <ChefHat size={16} />
        <span>Recipesaurus</span>
      </footer>

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onDelete={() => handleDeleteRecipe(selectedRecipe.id)}
          onEdit={() => {
            setEditingRecipe(selectedRecipe);
            setSelectedRecipe(null);
          }}
        />
      )}

      {showAddModal && (
        <AddRecipeModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddRecipe}
        />
      )}

      {editingRecipe && (
        <AddRecipeModal
          recipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSubmit={handleUpdateRecipe}
        />
      )}

      {showCookbookModal && (
        <CookbookModal
          cookbook={editingCookbook || undefined}
          onClose={() => {
            setShowCookbookModal(false);
            setEditingCookbook(null);
          }}
          onSubmit={handleSaveCookbook}
          onDelete={editingCookbook ? () => {
            deleteCookbook(editingCookbook.id);
            setShowCookbookModal(false);
            setEditingCookbook(null);
          } : undefined}
        />
      )}

      {selectedCookbook && (
        <CookbookDetail
          cookbook={selectedCookbook}
          onClose={() => setSelectedCookbook(null)}
          onEdit={() => {
            setEditingCookbook(selectedCookbook);
            setSelectedCookbook(null);
            setShowCookbookModal(true);
          }}
          onShare={() => {
            setSharingCookbook(selectedCookbook);
            setSelectedCookbook(null);
          }}
          onRemoveRecipe={(recipeId) => removeRecipeFromCookbook(selectedCookbook.id, recipeId)}
          onLeave={!selectedCookbook.isOwner ? () => leaveCookbook(selectedCookbook.id) : undefined}
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
          onCreateCookbook={() => {
            setAddToCookbookRecipe(null);
            setShowCookbookModal(true);
          }}
        />
      )}
    </>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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
            onForgotPassword={() => {
              setAuthModal(null);
              setShowForgotPassword(true);
            }}
          />
        )}
        {showForgotPassword && (
          <ForgotPasswordModal
            onClose={() => setShowForgotPassword(false)}
            onBackToLogin={() => {
              setShowForgotPassword(false);
              setAuthModal('login');
            }}
          />
        )}
      </>
    );
  }

  return (
    <RecipeProvider>
      <CookbookProvider>
        <NotificationProvider>
          <RecipeApp />
        </NotificationProvider>
      </CookbookProvider>
    </RecipeProvider>
  );
}

function SharedCookbookRoute() {
  return (
    <Routes>
      <Route path="/shared/:token" element={<SharedCookbookWrapper />} />
    </Routes>
  );
}

function SharedCookbookWrapper() {
  const token = window.location.pathname.split('/shared/')[1];
  if (!token) return <Navigate to="/" replace />;
  return <SharedCookbookView token={token} />;
}

function ResetPasswordRoute() {
  return (
    <div className="app">
      <ResetPasswordPage />
    </div>
  );
}

function App() {
  const isSharedRoute = window.location.pathname.startsWith('/shared/');
  const isResetPasswordRoute = window.location.pathname.startsWith('/reset-password');

  return (
    <ClientProvider client={defaultClient}>
      <AuthProvider>
        <div className="app">
          {isResetPasswordRoute ? (
            <ResetPasswordRoute />
          ) : isSharedRoute ? (
            <SharedCookbookRoute />
          ) : (
            <AppContent />
          )}
        </div>
      </AuthProvider>
    </ClientProvider>
  );
}

export default App;
