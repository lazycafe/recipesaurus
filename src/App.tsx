import { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { ClientProvider } from './client/ClientContext';
import { defaultClient, getClient, isDevClientEnabled } from './client/defaultClient';
import type { IClient } from './client/types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RecipeProvider, useRecipes } from './context/RecipeContext';
import { CookbookProvider, useCookbooks } from './context/CookbookContext';
import { NotificationProvider } from './context/NotificationContext';
import { DiscoveryProvider } from './context/DiscoveryContext';
import { ToastProvider } from './context/ToastContext';
import { Header } from './components/Header';
import { SearchFilter } from './components/SearchFilter';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetail } from './components/RecipeDetail';
import { AddRecipeModal } from './components/AddRecipeModal';
import { AuthModal } from './components/AuthModal';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { VerifyEmailPage } from './components/VerifyEmailPage';
import { EmptyState } from './components/EmptyState';
import { CookbookList } from './components/CookbookList';
import { CookbookModal } from './components/CookbookModal';
import { CookbookDetailPage } from './components/CookbookDetailPage';
import { AddToCookbookModal } from './components/AddToCookbookModal';
import { SharedCookbookView } from './components/SharedCookbookView';
import { SharedRecipePreview } from './components/SharedRecipePreview';
import { SettingsPage } from './components/SettingsPage';
import { TermsPage } from './components/TermsPage';
import { FeedbackPage } from './components/FeedbackPage';
import { DiscoveryPage } from './components/DiscoveryPage';
import { PublicHomePage } from './components/PublicHomePage';
import { Recipe, RecipeFormData } from './types/Recipe';
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
}: {
  onCreateCookbook: () => void;
}) {
  return (
    <CookbookList
      onCreateCookbook={onCreateCookbook}
    />
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RecipeApp() {
  const { addRecipe, updateRecipe, deleteRecipe } = useRecipes();
  const { createCookbook } = useCookbooks();
  const location = useLocation();

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCookbookModal, setShowCookbookModal] = useState(false);
  const [addToCookbookRecipe, setAddToCookbookRecipe] = useState<Recipe | null>(null);

  const currentView = location.pathname.startsWith('/cookbooks') ? 'cookbooks' :
    location.pathname.startsWith('/recipes') ? 'recipes' : 'discover';

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

  const handleSaveCookbook = async (data: { name: string; description?: string; coverImage?: string; isPublic?: boolean }) => {
    await createCookbook(data);
  };

  return (
    <>
      <ScrollToTop />
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
              element={<DiscoveryPage />}
            />
            <Route
              path="/discover"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/recipes"
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
              path="/cookbooks"
              element={
                <CookbooksView
                  onCreateCookbook={() => setShowCookbookModal(true)}
                />
              }
            />
            <Route
              path="/cookbooks/:id"
              element={<CookbookDetailPage />}
            />
            <Route
              path="/settings"
              element={<SettingsPage />}
            />
            <Route
              path="/terms"
              element={<TermsPage />}
            />
            <Route
              path="/feedback"
              element={<FeedbackPage />}
            />
          </Routes>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <ChefHat size={16} />
            <span>Recipesaurus</span>
          </div>
          <div className="footer-links">
            <Link to="/terms">Terms of Use</Link>
            <Link to="/feedback">Give Feedback</Link>
            <a href="https://buymeacoffee.com/andreayang" target="_blank" rel="noopener noreferrer">Buy Me a Coffee</a>
          </div>
          <div className="footer-copyright">
            © 2026 Andrea Yang. All Rights Reserved.
          </div>
        </div>
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
          onClose={() => setShowCookbookModal(false)}
          onSubmit={handleSaveCookbook}
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
        <PublicHomePage
          onSignIn={() => setAuthModal('login')}
          onSignUp={() => setAuthModal('register')}
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
          <DiscoveryProvider>
            <ToastProvider>
              <RecipeApp />
            </ToastProvider>
          </DiscoveryProvider>
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

function SharedRecipePreviewRoute() {
  const { user } = useAuth();
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const encodedData = window.location.pathname.split('/preview/')[1];
  if (!encodedData) return <Navigate to="/" replace />;

  return (
    <>
      <SharedRecipePreview
        encodedData={encodedData}
        isLoggedIn={!!user}
        onSignIn={() => setAuthModal('login')}
        onSignUp={() => setAuthModal('register')}
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

function ResetPasswordRoute() {
  return (
    <div className="app">
      <ResetPasswordPage />
    </div>
  );
}

function VerifyEmailRoute() {
  return (
    <div className="app">
      <VerifyEmailPage />
    </div>
  );
}

function AppWithClient({ client }: { client: IClient }) {
  const isSharedRoute = window.location.pathname.startsWith('/shared/');
  const isPreviewRoute = window.location.pathname.startsWith('/preview/');
  const isResetPasswordRoute = window.location.pathname.startsWith('/reset-password');
  const isVerifyEmailRoute = window.location.pathname.startsWith('/verify-email');

  return (
    <ClientProvider client={client}>
      <AuthProvider>
        <div className="app">
          {isResetPasswordRoute ? (
            <ResetPasswordRoute />
          ) : isVerifyEmailRoute ? (
            <VerifyEmailRoute />
          ) : isSharedRoute ? (
            <SharedCookbookRoute />
          ) : isPreviewRoute ? (
            <SharedRecipePreviewRoute />
          ) : (
            <AppContent />
          )}
        </div>
      </AuthProvider>
    </ClientProvider>
  );
}

function App() {
  const [client, setClient] = useState<IClient | null>(
    isDevClientEnabled() ? null : defaultClient
  );

  useEffect(() => {
    if (isDevClientEnabled()) {
      getClient().then(setClient);
    }
  }, []);

  if (!client) {
    return <LoadingScreen />;
  }

  return <AppWithClient client={client} />;
}

export default App;
