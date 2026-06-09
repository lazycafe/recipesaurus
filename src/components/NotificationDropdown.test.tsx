import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { NotificationDropdown } from './NotificationDropdown';
import * as NotificationContext from '../context/NotificationContext';
import * as CookbookContext from '../context/CookbookContext';
import * as RecipeContext from '../context/RecipeContext';
import * as ToastContext from '../context/ToastContext';
import type { Notification } from '../client/types';

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

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

describe('NotificationDropdown', () => {
  const recipeAddedNotification: Notification = {
    id: 'notification-1',
    type: 'recipe_added',
    title: 'New Recipe Added',
    message: 'Alex added "Pesto Pasta" to "Weeknight Dinners"',
    data: {
      cookbookId: 'cookbook-1',
      cookbookName: 'Weeknight Dinners',
      recipeId: 'recipe-1',
      addedBy: 'Alex',
    },
    isRead: false,
    createdAt: Date.now(),
  };

  const markAsRead = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    markAsRead.mockClear();

    vi.mocked(NotificationContext.useNotifications).mockReturnValue({
      notifications: [recipeAddedNotification],
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

  it('navigates to the cookbook recipe detail when a recipe-added notification is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/cookbooks']}>
        <NotificationDropdown />
        <LocationDisplay />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText('Notifications'));
    fireEvent.click(screen.getByText('Alex added "Pesto Pasta" to "Weeknight Dinners"'));

    await waitFor(() => {
      expect(markAsRead).toHaveBeenCalledWith('notification-1');
      expect(screen.getByTestId('location').textContent).toBe('/cookbooks/cookbook-1?recipeId=recipe-1');
    });
  });
});
