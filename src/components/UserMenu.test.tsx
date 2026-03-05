import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import * as AuthContext from '../context/AuthContext';
import * as NotificationContext from '../context/NotificationContext';
import * as CookbookContext from '../context/CookbookContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/NotificationContext', () => ({
  useNotifications: vi.fn(),
}));

vi.mock('../context/CookbookContext', () => ({
  useCookbooks: vi.fn(),
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

  beforeEach(() => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
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
      clearAll: vi.fn(),
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

  it('returns null when no user', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
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

  it('shows user email in menu header', () => {
    renderWithRouter(<UserMenu />);
    fireEvent.click(screen.getByLabelText('User menu'));
    expect(screen.getByText('test@example.com')).toBeDefined();
  });
});
