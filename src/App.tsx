import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { ClientProvider } from './client/ClientContext';
import { defaultClient, getClient, isDevClientEnabled } from './client/defaultClient';
import type { IClient } from './client/types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CookbookProvider, useCookbooks } from './context/CookbookContext';
import { RecipeProvider, useRecipes } from './context/RecipeContext';
import type { RecipeFormData } from './types/Recipe';
import { NotificationProvider } from './context/NotificationContext';
import { DiscoveryProvider } from './context/DiscoveryContext';
import { ToastProvider } from './context/ToastContext';
import { Header } from './components/Header';
import { PendingPublicHomeRecipeSave } from './components/PendingPublicHomeRecipeSave';
import { Loader2, ChefHat } from 'lucide-react';
import './App.css';

const AuthModal = lazy(() => import('./components/AuthModal').then(module => ({ default: module.AuthModal })));
const ForgotPasswordModal = lazy(() => import('./components/ForgotPasswordModal').then(module => ({ default: module.ForgotPasswordModal })));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('./components/VerifyEmailPage').then(module => ({ default: module.VerifyEmailPage })));
const CookbookList = lazy(() => import('./components/CookbookList').then(module => ({ default: module.CookbookList })));
const CookbookModal = lazy(() => import('./components/CookbookModal').then(module => ({ default: module.CookbookModal })));
const AddRecipeModal = lazy(() => import('./components/AddRecipeModal').then(module => ({ default: module.AddRecipeModal })));
const CookbookDetailPage = lazy(() => import('./components/CookbookDetailPage').then(module => ({ default: module.CookbookDetailPage })));
const SharedCookbookView = lazy(() => import('./components/SharedCookbookView').then(module => ({ default: module.SharedCookbookView })));
const SharedRecipePreview = lazy(() => import('./components/SharedRecipePreview').then(module => ({ default: module.SharedRecipePreview })));
const SettingsPage = lazy(() => import('./components/SettingsPage').then(module => ({ default: module.SettingsPage })));
const TermsPage = lazy(() => import('./components/TermsPage').then(module => ({ default: module.TermsPage })));
const FeedbackPage = lazy(() => import('./components/FeedbackPage').then(module => ({ default: module.FeedbackPage })));
const DiscoveryPage = lazy(() => import('./components/DiscoveryPage').then(module => ({ default: module.DiscoveryPage })));
const PublicHomePage = lazy(() => import('./components/PublicHomePage').then(module => ({ default: module.PublicHomePage })));
const PublicCookbookDetailPage = lazy(() => import('./components/PublicCookbookDetailPage').then(module => ({ default: module.PublicCookbookDetailPage })));
const MyRecipesPage = lazy(() => import('./components/MyRecipesPage').then(module => ({ default: module.MyRecipesPage })));
const MealPlannerPage = lazy(() => import('./components/MealPlannerPage').then(module => ({ default: module.MealPlannerPage })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then(module => ({ default: module.ProfilePage })));

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <Loader2 size={32} className="spin" />
    </div>
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

function CurrentProfileRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? `/profiles/${user.id}` : '/'} replace />;
}

export function getAuthenticatedDefaultRoute(recipeCount: number): string {
  return recipeCount > 0 ? '/my-recipes' : '/discover/recipes';
}

function AuthenticatedDefaultRedirect() {
  const { recipes, isLoading } = useRecipes();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <Navigate to={getAuthenticatedDefaultRoute(recipes.length)} replace />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RecipeApp() {
  const { createCookbook } = useCookbooks();
  const { addRecipe } = useRecipes();
  const [showCookbookModal, setShowCookbookModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  const handleSaveCookbook = async (data: { name: string; description?: string; coverImage?: string | null; isPublic?: boolean }) => {
    const cookbookId = await createCookbook({
      ...data,
      coverImage: data.coverImage ?? undefined,
    });
    if (!cookbookId) {
      throw new Error('Failed to save cookbook. Please try again.');
    }
  };

  const handleAddRecipe = async (formData: RecipeFormData) => {
    await addRecipe({
      title: formData.title.trim(),
      description: formData.description.trim(),
      ingredients: formData.ingredients.split('\n').map(i => i.trim()).filter(Boolean),
      instructions: formData.instructions.split('\n').map(i => i.trim()).filter(Boolean),
      tags: formData.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      imageUrl: formData.imageUrl?.trim() || undefined,
      prepTime: formData.prepTime?.trim() || undefined,
      cookTime: formData.cookTime?.trim() || undefined,
      servings: formData.servings?.trim() || undefined,
      sourceUrl: formData.sourceUrl?.trim() || undefined,
      isPublic: formData.isPublic,
    });
    setShowRecipeModal(false);
  };

  return (
    <>
      <ScrollToTop />
      <PendingPublicHomeRecipeSave />
      <Header
        onCreateRecipe={() => setShowRecipeModal(true)}
        onCreateCookbook={() => setShowCookbookModal(true)}
      />

      <main className="main">
        <div className="container">
          <Routes>
            <Route
              path="/"
              element={<AuthenticatedDefaultRedirect />}
            />
            <Route
              path="/discover"
              element={<Navigate to="/discover/recipes" replace />}
            />
            <Route
              path="/discover/recipes"
              element={<DiscoveryPage tab="recipes" />}
            />
            <Route
              path="/discover/cookbooks"
              element={<DiscoveryPage tab="cookbooks" />}
            />
            <Route
              path="/discover/cookbooks/:id"
              element={<PublicCookbookDetailPage />}
            />
            <Route
              path="/my-recipes"
              element={<MyRecipesPage />}
            />
            <Route
              path="/meal-planner"
              element={<MealPlannerPage />}
            />
            <Route
              path="/recipes"
              element={<Navigate to="/my-recipes" replace />}
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
              path="/profile"
              element={<CurrentProfileRedirect />}
            />
            <Route
              path="/profiles/:userId"
              element={<ProfilePage />}
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
          <Link to="/" className="footer-brand" aria-label="Recipesaurus home">
            <ChefHat size={16} />
            <span>Recipesaurus</span>
          </Link>
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

      {showCookbookModal && (
        <CookbookModal
          onClose={() => setShowCookbookModal(false)}
          onSubmit={handleSaveCookbook}
        />
      )}

      {showRecipeModal && (
        <AddRecipeModal
          onClose={() => setShowRecipeModal(false)}
          onSubmit={handleAddRecipe}
        />
      )}
    </>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    if (location.pathname.startsWith('/profiles/')) {
      return <PublicProfileRoute />;
    }

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
    <ToastProvider>
      <RecipeProvider>
        <CookbookProvider>
          <NotificationProvider>
            <DiscoveryProvider>
              <RecipeApp />
            </DiscoveryProvider>
          </NotificationProvider>
        </CookbookProvider>
      </RecipeProvider>
    </ToastProvider>
  );
}

function PublicProfileRoute() {
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  return (
    <ToastProvider>
      <Header />
      <main className="main">
        <div className="container">
          <Routes>
            <Route
              path="/profiles/:userId"
              element={<ProfilePage onSignIn={() => setAuthModal('login')} />}
            />
          </Routes>
        </div>
      </main>

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
    </ToastProvider>
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

export function getSharedRecipePreviewData(pathname: string = window.location.pathname): string | null {
  const match = pathname.match(/^\/(?:preview|recipe)\/(.+)$/);
  return match?.[1] ?? null;
}

export function getSharedRecipeToken(pathname: string = window.location.pathname): string | null {
  const match = pathname.match(/^\/shared-recipe\/([^/]+)$/);
  return match?.[1] ?? null;
}

function SharedRecipePreviewRoute() {
  const { user, isLoading } = useAuth();
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const encodedData = getSharedRecipePreviewData();
  const shareToken = getSharedRecipeToken();
  if (!encodedData && !shareToken) return <Navigate to="/" replace />;

  return (
    <>
      <SharedRecipePreview
        encodedData={encodedData ?? undefined}
        shareToken={shareToken ?? undefined}
        isLoggedIn={!!user}
        isAuthLoading={isLoading}
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
  const isPreviewRoute = getSharedRecipePreviewData() !== null || getSharedRecipeToken() !== null;
  const isResetPasswordRoute = window.location.pathname.startsWith('/reset-password');
  const isVerifyEmailRoute = window.location.pathname.startsWith('/verify-email');

  return (
    <ClientProvider client={client}>
      <AuthProvider>
        <div className="app">
          <Suspense fallback={<LoadingScreen />}>
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
          </Suspense>
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
