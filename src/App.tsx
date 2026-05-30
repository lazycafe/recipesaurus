import { useState, useEffect } from 'react';
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
import { AuthModal } from './components/AuthModal';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { VerifyEmailPage } from './components/VerifyEmailPage';
import { CookbookList } from './components/CookbookList';
import { CookbookModal } from './components/CookbookModal';
import { AddRecipeModal } from './components/AddRecipeModal';
import { CookbookDetailPage } from './components/CookbookDetailPage';
import { SharedCookbookView } from './components/SharedCookbookView';
import { SharedRecipePreview } from './components/SharedRecipePreview';
import { SettingsPage } from './components/SettingsPage';
import { TermsPage } from './components/TermsPage';
import { FeedbackPage } from './components/FeedbackPage';
import { DiscoveryPage } from './components/DiscoveryPage';
import { PublicHomePage } from './components/PublicHomePage';
import { PublicCookbookDetailPage } from './components/PublicCookbookDetailPage';
import { MyRecipesPage } from './components/MyRecipesPage';
import { MealPlannerPage } from './components/MealPlannerPage';
import { canAccessMealPlanner } from './utils/mealPlannerAccess';
import { Loader2, ChefHat } from 'lucide-react';
import './App.css';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <Loader2 size={32} className="spin" />
    </div>
  );
}

export const PAGE_KEYS = {
  publicHome: 'public_home',
  discoverRecipes: 'discover_recipes',
  discoverCookbooks: 'discover_cookbooks',
  discoverCookbookDetail: 'discover_cookbook_detail',
  myRecipes: 'my_recipes',
  cookbooks: 'cookbooks',
  cookbookDetail: 'cookbook_detail',
  settings: 'settings',
  terms: 'terms',
  feedback: 'feedback',
  sharedCookbook: 'shared_cookbook',
  sharedRecipePreview: 'shared_recipe_preview',
  resetPassword: 'reset_password',
  verifyEmail: 'verify_email',
} as const;

type PageKey = typeof PAGE_KEYS[keyof typeof PAGE_KEYS];

interface PageKeyContext {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
}

const trackedPageViewSignatures = new Set<string>();

function rememberTrackedPageView(signature: string): void {
  trackedPageViewSignatures.add(signature);
  if (trackedPageViewSignatures.size > 100) {
    const first = trackedPageViewSignatures.values().next();
    if (!first.done) {
      trackedPageViewSignatures.delete(first.value);
    }
  }
}

export function getPageKeyForPath(pathname: string, context: PageKeyContext): PageKey | null {
  if (pathname.startsWith('/reset-password')) return PAGE_KEYS.resetPassword;
  if (pathname.startsWith('/verify-email')) return PAGE_KEYS.verifyEmail;
  if (/^\/shared\/[^/]+$/.test(pathname)) return PAGE_KEYS.sharedCookbook;
  if (getSharedRecipePreviewData(pathname) !== null || getSharedRecipeToken(pathname) !== null) {
    return PAGE_KEYS.sharedRecipePreview;
  }

  if (context.isAuthLoading) return null;
  if (!context.isAuthenticated) return PAGE_KEYS.publicHome;

  if (pathname === '/' || pathname === '/discover' || pathname === '/recipes') return null;
  if (pathname === '/discover/recipes') return PAGE_KEYS.discoverRecipes;
  if (pathname === '/discover/cookbooks') return PAGE_KEYS.discoverCookbooks;
  if (/^\/discover\/cookbooks\/[^/]+$/.test(pathname)) return PAGE_KEYS.discoverCookbookDetail;
  if (pathname === '/my-recipes') return PAGE_KEYS.myRecipes;
  if (pathname === '/cookbooks') return PAGE_KEYS.cookbooks;
  if (/^\/cookbooks\/[^/]+$/.test(pathname)) return PAGE_KEYS.cookbookDetail;
  if (pathname === '/settings') return PAGE_KEYS.settings;
  if (pathname === '/terms') return PAGE_KEYS.terms;
  if (pathname === '/feedback') return PAGE_KEYS.feedback;

  return null;
}

function PageViewTracker({ client }: { client: IClient }) {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const pageKey = getPageKeyForPath(location.pathname, {
    isAuthenticated: !!user,
    isAuthLoading: isLoading,
  });

  useEffect(() => {
    if (!pageKey) return;

    const signature = `${location.key}:${pageKey}`;
    if (trackedPageViewSignatures.has(signature)) return;

    rememberTrackedPageView(signature);
    void client.analytics.trackPageView(pageKey).then(result => {
      if (result.error && import.meta.env.DEV) {
        console.warn('Failed to track page view:', result.error);
      }
    });
  }, [client, location.key, pageKey]);

  return null;
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
  const { user } = useAuth();
  const { createCookbook } = useCookbooks();
  const { addRecipe } = useRecipes();
  const [showCookbookModal, setShowCookbookModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const canUseMealPlanner = canAccessMealPlanner(user?.id);

  const handleSaveCookbook = async (data: { name: string; description?: string; coverImage?: string; isPublic?: boolean }) => {
    await createCookbook(data);
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
      <Header
        onCreateRecipe={() => setShowRecipeModal(true)}
        onCreateCookbook={() => setShowCookbookModal(true)}
      />

      <main className="main">
        <div className="container">
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/discover/recipes" replace />}
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
              element={canUseMealPlanner ? <MealPlannerPage /> : <Navigate to="/discover/recipes" replace />}
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
          <PageViewTracker client={client} />
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
