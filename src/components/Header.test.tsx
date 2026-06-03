import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './Header';
import * as AuthContext from '../context/AuthContext';
import * as NotificationContext from '../context/NotificationContext';
import * as CookbookContext from '../context/CookbookContext';
import * as RecipeContext from '../context/RecipeContext';
import * as ToastContext from '../context/ToastContext';

// Mock the contexts
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/NotificationContext', () => ({
  useNotifications: vi.fn(),
}));

vi.mock('../context/CookbookContext', () => ({
  useCookbooks: vi.fn(),
}));

vi.mock('../context/RecipeContext', () => ({
  useRecipes: vi.fn(),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: vi.fn(),
}));

describe('Header', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
  };

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  beforeEach(() => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      devLogin: vi.fn(),
    });

    vi.mocked(NotificationContext.useNotifications).mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      refresh: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      clearAll: vi.fn(),
      acceptInvite: vi.fn(),
      declineInvite: vi.fn(),
      acceptRecipeShare: vi.fn(),
      declineRecipeShare: vi.fn(),
      acceptFriendRequest: vi.fn(),
      declineFriendRequest: vi.fn(),
    });

    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      leaveCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });

    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [],
      isLoading: false,
      addRecipe: vi.fn(),
      updateRecipe: vi.fn(),
      deleteRecipe: vi.fn(),
      getAllTags: vi.fn(() => []),
      refreshRecipes: vi.fn(),
    });

    vi.mocked(ToastContext.useToast).mockReturnValue({
      showToast: vi.fn(),
      hideToast: vi.fn(),
    });
  });

  it('renders logo', () => {
    renderWithRouter(<Header />);
    expect(screen.getByText('Recipesaurus')).toBeDefined();
  });

  it('links the logo to the home page', () => {
    renderWithRouter(<Header />);
    expect(screen.getByRole('link', { name: /recipesaurus home/i }).getAttribute('href')).toBe('/');
  });

  it('hides navigation when no user', () => {
    renderWithRouter(<Header />);
    expect(screen.queryByText('Discover')).toBeNull();
    expect(screen.queryByText('Meal Plan')).toBeNull();
    expect(screen.queryByText('Cookbooks')).toBeNull();
  });

  it('shows navigation when user logged in', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      devLogin: vi.fn(),
    });

    const { container } = renderWithRouter(<Header />);
    expect(screen.getAllByText('Discover').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Meal Plan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cookbooks').length).toBeGreaterThan(0);
    expect(Array.from(container.querySelectorAll('.header-nav .nav-tab')).map(item => item.textContent?.trim())).toEqual([
      'Discover',
      'My Recipes',
      'Cookbooks',
      'Meal Plan',
    ]);
  });

  it('shows user name when logged in', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      devLogin: vi.fn(),
    });

    renderWithRouter(<Header />);
    expect(screen.getByText('Test User')).toBeDefined();
  });

  it('calls logout when sign out clicked in user menu', () => {
    const logout = vi.fn();
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout,
      updateProfile: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      devLogin: vi.fn(),
    });

    renderWithRouter(<Header />);
    // Open user menu
    fireEvent.click(screen.getByLabelText('User menu'));
    // Click sign out
    fireEvent.click(screen.getByText('Sign out'));
    expect(logout).toHaveBeenCalledOnce();
  });

  it('renders mobile navigation when user logged in', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      devLogin: vi.fn(),
    });

    const { container } = renderWithRouter(<Header />);
    expect(container.querySelector('.mobile-nav')).toBeDefined();
    expect(screen.getAllByText('Meal Plan').length).toBeGreaterThan(0);
    expect(Array.from(container.querySelectorAll('.mobile-nav-item')).map(item => item.textContent?.trim())).toEqual([
      'Discover',
      'My Recipes',
      'Cookbooks',
      'Meal Plan',
    ]);
  });

  it('hides mobile navigation when no user', () => {
    const { container } = renderWithRouter(<Header />);
    expect(container.querySelector('.mobile-nav')).toBeNull();
  });
});
