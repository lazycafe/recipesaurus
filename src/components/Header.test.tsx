import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './Header';
import * as AuthContext from '../context/AuthContext';
import * as NotificationContext from '../context/NotificationContext';
import * as CookbookContext from '../context/CookbookContext';

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

describe('Header', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
  };

  const defaultProps = {
    currentView: 'recipes' as const,
    onAddRecipe: vi.fn(),
    onAddCookbook: vi.fn(),
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
    });

    vi.mocked(NotificationContext.useNotifications).mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      refresh: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      acceptInvite: vi.fn(),
      declineInvite: vi.fn(),
    });

    vi.mocked(CookbookContext.useCookbooks).mockReturnValue({
      ownedCookbooks: [],
      sharedCookbooks: [],
      isLoading: false,
      createCookbook: vi.fn(),
      updateCookbook: vi.fn(),
      deleteCookbook: vi.fn(),
      addRecipeToCookbook: vi.fn(),
      removeRecipeFromCookbook: vi.fn(),
      refreshCookbooks: vi.fn(),
    });
  });

  it('renders logo', () => {
    renderWithRouter(<Header {...defaultProps} />);
    expect(screen.getByText('Recipesaurus')).toBeDefined();
  });

  it('hides navigation when no user', () => {
    renderWithRouter(<Header {...defaultProps} />);
    expect(screen.queryByText('Recipes')).toBeNull();
    expect(screen.queryByText('Cookbooks')).toBeNull();
  });

  it('shows navigation when user logged in', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(<Header {...defaultProps} />);
    expect(screen.getAllByText('Recipes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cookbooks').length).toBeGreaterThan(0);
  });

  it('shows user name when logged in', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(<Header {...defaultProps} />);
    expect(screen.getByText('Test User')).toBeDefined();
  });

  it('shows New Recipe button in recipes view', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(<Header {...defaultProps} currentView="recipes" />);
    expect(screen.getByText('New Recipe')).toBeDefined();
  });

  it('shows New Cookbook button in cookbooks view', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(<Header {...defaultProps} currentView="cookbooks" />);
    expect(screen.getByText('New Cookbook')).toBeDefined();
  });

  it('calls onAddRecipe when New Recipe clicked', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    const onAddRecipe = vi.fn();
    renderWithRouter(<Header {...defaultProps} onAddRecipe={onAddRecipe} />);

    fireEvent.click(screen.getByText('New Recipe'));
    expect(onAddRecipe).toHaveBeenCalledOnce();
  });

  it('calls onAddCookbook when New Cookbook clicked', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    const onAddCookbook = vi.fn();
    renderWithRouter(
      <Header {...defaultProps} currentView="cookbooks" onAddCookbook={onAddCookbook} />
    );

    fireEvent.click(screen.getByText('New Cookbook'));
    expect(onAddCookbook).toHaveBeenCalledOnce();
  });

  it('calls logout when sign out clicked in user menu', () => {
    const logout = vi.fn();
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout,
    });

    renderWithRouter(<Header {...defaultProps} />);
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
    });

    const { container } = renderWithRouter(<Header {...defaultProps} />);
    expect(container.querySelector('.mobile-nav')).toBeDefined();
  });

  it('hides mobile navigation when no user', () => {
    const { container } = renderWithRouter(<Header {...defaultProps} />);
    expect(container.querySelector('.mobile-nav')).toBeNull();
  });
});
