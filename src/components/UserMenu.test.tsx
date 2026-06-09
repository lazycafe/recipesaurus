import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import * as AuthContext from '../context/AuthContext';
import * as NotificationContext from '../context/NotificationContext';
import * as CookbookContext from '../context/CookbookContext';
import * as RecipeContext from '../context/RecipeContext';
import * as ToastContext from '../context/ToastContext';

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

describe('UserMenu', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
  };

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  function LocationDisplay() {
    const location = useLocation();
    return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
  }

  const renderWithLocation = (ui: React.ReactElement, initialPath = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        {ui}
        <LocationDisplay />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
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

  it('returns null when no user', () => {
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

    const { container } = renderWithRouter(<UserMenu />);
    expect(container.firstChild).toBeNull();
  });

  it('renders user name', () => {
    renderWithRouter(<UserMenu />);
    expect(screen.getByText('Test User')).toBeDefined();
  });

  it('opens menu on click', () => {
    renderWithRouter(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('Sign out')).toBeDefined();
  });

  it('shows Settings link in menu', () => {
    renderWithRouter(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('shows notification dot when unread notifications', () => {
    vi.mocked(NotificationContext.useNotifications).mockReturnValue({
      notifications: [{
        id: '1',
        type: 'cookbook_invite',
        title: 'Cookbook Invite',
        message: 'Test',
        data: { inviteId: 'inv-1' },
        isRead: false,
        createdAt: Date.now()
      }],
      unreadCount: 1,
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

    const { container } = renderWithRouter(<UserMenu />);
    expect(container.querySelector('.user-notification-dot')).toBeDefined();
  });

  it('calls logout when sign out clicked', () => {
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

    renderWithRouter(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Sign out'));
    expect(logout).toHaveBeenCalledOnce();
  });

  it('shows Notifications section in menu', () => {
    renderWithRouter(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('Notifications')).toBeDefined();
  });

  it('accepts friend request notifications', async () => {
    const acceptFriendRequest = vi.fn().mockResolvedValue({ friendId: 'friend-1', friendName: 'Friend' });
    const showToast = vi.fn();
    vi.mocked(ToastContext.useToast).mockReturnValue({
      showToast,
      hideToast: vi.fn(),
    });
    vi.mocked(NotificationContext.useNotifications).mockReturnValue({
      notifications: [{
        id: '1',
        type: 'friend_request',
        title: 'Friend request',
        message: 'Friend sent you a friend request',
        data: { friendRequestId: 'request-1', requesterId: 'friend-1', requesterName: 'Friend' },
        isRead: false,
        createdAt: Date.now()
      }],
      unreadCount: 1,
      isLoading: false,
      refresh: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      clearAll: vi.fn(),
      acceptInvite: vi.fn(),
      declineInvite: vi.fn(),
      acceptRecipeShare: vi.fn(),
      declineRecipeShare: vi.fn(),
      acceptFriendRequest,
      declineFriendRequest: vi.fn(),
    });

    renderWithRouter(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => expect(acceptFriendRequest).toHaveBeenCalledWith('request-1'));
    expect(showToast).toHaveBeenCalledWith({
      message: 'Friend request accepted from Friend',
      type: 'success',
    });
    expect(screen.getByText('Notifications')).toBeDefined();
  });

  it('shows error feedback without navigating when accepting friend request notifications fails', async () => {
    const acceptFriendRequest = vi.fn().mockResolvedValue(null);
    const showToast = vi.fn();
    vi.mocked(ToastContext.useToast).mockReturnValue({
      showToast,
      hideToast: vi.fn(),
    });
    vi.mocked(NotificationContext.useNotifications).mockReturnValue({
      notifications: [{
        id: '1',
        type: 'friend_request',
        title: 'Friend request',
        message: 'Friend sent you a friend request',
        data: { friendRequestId: 'request-1', requesterId: 'friend-1', requesterName: 'Friend' },
        isRead: false,
        createdAt: Date.now()
      }],
      unreadCount: 1,
      isLoading: false,
      refresh: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      clearAll: vi.fn(),
      acceptInvite: vi.fn(),
      declineInvite: vi.fn(),
      acceptRecipeShare: vi.fn(),
      declineRecipeShare: vi.fn(),
      acceptFriendRequest,
      declineFriendRequest: vi.fn(),
    });

    renderWithRouter(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => expect(acceptFriendRequest).toHaveBeenCalledWith('request-1'));
    expect(showToast).toHaveBeenCalledWith({
      message: 'Could not accept friend request',
      type: 'error',
    });
    expect(screen.getByText('Notifications')).toBeDefined();
  });

  it('shows feedback when declining friend request notifications', async () => {
    const declineFriendRequest = vi.fn().mockResolvedValue(true);
    const showToast = vi.fn();
    vi.mocked(ToastContext.useToast).mockReturnValue({
      showToast,
      hideToast: vi.fn(),
    });
    vi.mocked(NotificationContext.useNotifications).mockReturnValue({
      notifications: [{
        id: '1',
        type: 'friend_request',
        title: 'Friend request',
        message: 'Friend sent you a friend request',
        data: { friendRequestId: 'request-1', requesterId: 'friend-1', requesterName: 'Friend' },
        isRead: false,
        createdAt: Date.now()
      }],
      unreadCount: 1,
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
      declineFriendRequest,
    });

    renderWithRouter(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Decline'));

    await waitFor(() => expect(declineFriendRequest).toHaveBeenCalledWith('request-1'));
    expect(showToast).toHaveBeenCalledWith({
      message: 'Friend request declined',
      type: 'success',
    });
    expect(screen.getByText('Notifications')).toBeDefined();
  });

  it('opens recipe share notifications in a new window', async () => {
    const markAsRead = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    vi.mocked(NotificationContext.useNotifications).mockReturnValue({
      notifications: [{
        id: '1',
        type: 'recipe_share',
        title: 'Recipe shared with you',
        message: 'Friend shared "Pasta" with you',
        data: { shareToken: 'share-token', recipeTitle: 'Pasta', sharedBy: 'Friend' },
        isRead: false,
        createdAt: Date.now()
      }],
      unreadCount: 1,
      isLoading: false,
      refresh: vi.fn(),
      markAsRead,
      markAllAsRead: vi.fn(),
      clearAll: vi.fn(),
      acceptInvite: vi.fn(),
      declineInvite: vi.fn(),
      acceptRecipeShare: vi.fn(),
      declineRecipeShare: vi.fn(),
      acceptFriendRequest: vi.fn(),
      declineFriendRequest: vi.fn(),
    });

    renderWithRouter(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Friend shared "Pasta" with you'));

    await waitFor(() => expect(markAsRead).toHaveBeenCalledWith('1'));
    expect(openSpy).toHaveBeenCalledWith(
      `${window.location.origin}/shared-recipe/share-token`,
      '_blank',
      'noopener,noreferrer'
    );

    openSpy.mockRestore();
  });

  it('navigates recipe added notifications to the logged-in recipe detail', async () => {
    const markAsRead = vi.fn();
    vi.mocked(NotificationContext.useNotifications).mockReturnValue({
      notifications: [{
        id: '1',
        type: 'recipe_added',
        title: 'New Recipe Added',
        message: 'Friend added "Pasta" to "Dinner"',
        data: {
          cookbookId: 'cookbook-1',
          cookbookName: 'Dinner',
          recipeId: 'recipe-1',
          addedBy: 'Friend',
        },
        isRead: false,
        createdAt: Date.now()
      }],
      unreadCount: 1,
      isLoading: false,
      refresh: vi.fn(),
      markAsRead,
      markAllAsRead: vi.fn(),
      clearAll: vi.fn(),
      acceptInvite: vi.fn(),
      declineInvite: vi.fn(),
      acceptRecipeShare: vi.fn(),
      declineRecipeShare: vi.fn(),
      acceptFriendRequest: vi.fn(),
      declineFriendRequest: vi.fn(),
    });

    renderWithLocation(<UserMenu />, '/my-recipes');
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Friend added "Pasta" to "Dinner"'));

    await waitFor(() => expect(markAsRead).toHaveBeenCalledWith('1'));
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/cookbooks/cookbook-1?recipeId=recipe-1');
    });
  });

  it('accepts recipe share notifications and refreshes recipes', async () => {
    const acceptRecipeShare = vi.fn().mockResolvedValue({ recipeId: 'recipe-1', recipeTitle: 'Pasta' });
    const refreshRecipes = vi.fn();
    const showToast = vi.fn();
    vi.mocked(RecipeContext.useRecipes).mockReturnValue({
      recipes: [],
      isLoading: false,
      addRecipe: vi.fn(),
      updateRecipe: vi.fn(),
      deleteRecipe: vi.fn(),
      getAllTags: vi.fn(() => []),
      refreshRecipes,
    });
    vi.mocked(ToastContext.useToast).mockReturnValue({
      showToast,
      hideToast: vi.fn(),
    });
    vi.mocked(NotificationContext.useNotifications).mockReturnValue({
      notifications: [{
        id: '1',
        type: 'recipe_share',
        title: 'Recipe shared with you',
        message: 'Friend shared "Pasta" with you',
        data: { shareToken: 'share-token', recipeTitle: 'Pasta', sharedBy: 'Friend' },
        isRead: false,
        createdAt: Date.now()
      }],
      unreadCount: 1,
      isLoading: false,
      refresh: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      clearAll: vi.fn(),
      acceptInvite: vi.fn(),
      declineInvite: vi.fn(),
      acceptRecipeShare,
      declineRecipeShare: vi.fn(),
      acceptFriendRequest: vi.fn(),
      declineFriendRequest: vi.fn(),
    });

    renderWithRouter(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => expect(acceptRecipeShare).toHaveBeenCalledWith('share-token'));
    await waitFor(() => expect(refreshRecipes).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith({
      message: '"Pasta" added to My Recipes',
      type: 'success',
    });
  });

  it('declines recipe share notifications', async () => {
    const declineRecipeShare = vi.fn().mockResolvedValue(true);
    const showToast = vi.fn();
    vi.mocked(ToastContext.useToast).mockReturnValue({
      showToast,
      hideToast: vi.fn(),
    });
    vi.mocked(NotificationContext.useNotifications).mockReturnValue({
      notifications: [{
        id: '1',
        type: 'recipe_share',
        title: 'Recipe shared with you',
        message: 'Friend shared "Pasta" with you',
        data: { shareToken: 'share-token', recipeTitle: 'Pasta', sharedBy: 'Friend' },
        isRead: false,
        createdAt: Date.now()
      }],
      unreadCount: 1,
      isLoading: false,
      refresh: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      clearAll: vi.fn(),
      acceptInvite: vi.fn(),
      declineInvite: vi.fn(),
      acceptRecipeShare: vi.fn(),
      declineRecipeShare,
      acceptFriendRequest: vi.fn(),
      declineFriendRequest: vi.fn(),
    });

    renderWithRouter(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    fireEvent.click(screen.getByText('Decline'));

    await waitFor(() => expect(declineRecipeShare).toHaveBeenCalledWith('share-token'));
    expect(showToast).toHaveBeenCalledWith({
      message: 'Recipe share declined',
      type: 'success',
    });
  });

  it('shows user email in menu header', () => {
    renderWithRouter(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('test@example.com')).toBeDefined();
  });
});
