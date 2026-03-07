import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublicHomePage } from '../components/PublicHomePage';
import { DiscoveryPage } from '../components/DiscoveryPage';
import * as AuthContext from '../context/AuthContext';
import * as DiscoveryContext from '../context/DiscoveryContext';

// Mock the contexts
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/DiscoveryContext', () => ({
  useDiscovery: vi.fn(),
}));

// Component that shows different content based on auth state (mirrors App.tsx logic)
function HomePageRouter() {
  const { user, isLoading } = AuthContext.useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <PublicHomePage onSignIn={() => {}} onSignUp={() => {}} />;
  }

  return <DiscoveryPage />;
}

describe('Home Page Routing', () => {
  const mockDiscoveryContext = {
    recipes: [],
    cookbooks: [],
    recipesTotal: 0,
    cookbooksTotal: 0,
    isLoadingRecipes: false,
    isLoadingCookbooks: false,
    selectedTags: [],
    loadRecipes: vi.fn(),
    loadCookbooks: vi.fn(),
    loadMoreRecipes: vi.fn(),
    loadMoreCookbooks: vi.fn(),
    setSelectedTags: vi.fn(),
    saveRecipe: vi.fn(),
    getPublicRecipe: vi.fn(),
    getPublicCookbook: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DiscoveryContext.useDiscovery).mockReturnValue(mockDiscoveryContext);
  });

  describe('when not logged in', () => {
    beforeEach(() => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: null,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        devLogin: vi.fn(),
      });
    });

    it('shows the public home page', () => {
      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      expect(screen.getByText('Save Recipes from Anywhere')).toBeDefined();
    });

    it('shows the URL extraction form', () => {
      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      expect(screen.getByPlaceholderText('Paste a recipe URL...')).toBeDefined();
    });

    it('shows the Extract button', () => {
      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      expect(screen.getByText('Extract')).toBeDefined();
    });

    it('shows Get Started Free button', () => {
      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      const buttons = screen.getAllByText('Get Started Free');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('shows Sign In button', () => {
      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      const buttons = screen.getAllByText('Sign In');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('shows features section', () => {
      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      expect(screen.getByText('Why Recipesaurus?')).toBeDefined();
    });

    it('does not show Discover page content', () => {
      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      // Should show public home page
      expect(screen.getByText('Save Recipes from Anywhere')).toBeDefined();

      // Should not show Discover page elements
      expect(screen.queryByText('Explore recipes and cookbooks shared by the community')).toBeNull();
      expect(screen.queryByPlaceholderText('Search recipes and cookbooks...')).toBeNull();
    });
  });

  describe('when logged in', () => {
    beforeEach(() => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        devLogin: vi.fn(),
      });
    });

    it('shows the Discover page as home', () => {
      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      expect(screen.getByText('Discover')).toBeDefined();
    });

    it('shows the Discover page description', () => {
      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      expect(screen.getByText('Explore recipes and cookbooks shared by the community')).toBeDefined();
    });

    it('shows the recipe search input', () => {
      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      expect(screen.getByPlaceholderText('Search recipes and cookbooks...')).toBeDefined();
    });

    it('shows trending tags', () => {
      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      expect(screen.getByText('Trending:')).toBeDefined();
    });

    it('shows Recipes and Cookbooks tabs', () => {
      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      expect(screen.getByRole('button', { name: /Recipes/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Cookbooks/i })).toBeDefined();
    });

    it('does not show public home page content', () => {
      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      // Should show Discover page
      expect(screen.getByText('Discover')).toBeDefined();

      // Should not show public home page elements
      expect(screen.queryByText('Save Recipes from Anywhere')).toBeNull();
      expect(screen.queryByText('Why Recipesaurus?')).toBeNull();
      expect(screen.queryByPlaceholderText('Paste a recipe URL...')).toBeNull();
    });
  });

  describe('loading state', () => {
    it('shows loading state while auth is loading', () => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: null,
        isLoading: true,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        devLogin: vi.fn(),
      });

      render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      expect(screen.getByText('Loading...')).toBeDefined();
    });
  });

  describe('auth state transitions', () => {
    it('transitions from public to discover page after login', async () => {
      // Start with logged out state
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: null,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        devLogin: vi.fn(),
      });

      const { rerender } = render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      // Initially shows public home page
      expect(screen.getByText('Save Recipes from Anywhere')).toBeDefined();

      // Simulate login by updating the mock
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        devLogin: vi.fn(),
      });

      // Re-render to pick up auth state change
      rerender(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      // Now shows Discover page
      await waitFor(() => {
        expect(screen.getByText('Discover')).toBeDefined();
      });
    });

    it('transitions from discover to public page after logout', async () => {
      // Start with logged in state
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        devLogin: vi.fn(),
      });

      const { rerender } = render(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      // Initially shows Discover page
      expect(screen.getByText('Discover')).toBeDefined();

      // Simulate logout by updating the mock
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        user: null,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        devLogin: vi.fn(),
      });

      // Re-render to pick up auth state change
      rerender(
        <MemoryRouter>
          <HomePageRouter />
        </MemoryRouter>
      );

      // Now shows public home page
      await waitFor(() => {
        expect(screen.getByText('Save Recipes from Anywhere')).toBeDefined();
      });
    });
  });
});
