import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';
import * as AuthContext from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('SettingsPage', () => {
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
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
    });
  });

  it('returns null when no user', () => {
    const { container } = renderWithRouter(<SettingsPage />);
    expect(container.firstChild).toBeNull();
  });

  it('renders settings page when user logged in', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
    });

    renderWithRouter(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('displays user name', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
    });

    renderWithRouter(<SettingsPage />);
    expect(screen.getByText('Test User')).toBeDefined();
  });

  it('displays user email', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
    });

    renderWithRouter(<SettingsPage />);
    expect(screen.getByText('test@example.com')).toBeDefined();
  });

  it('shows Account section heading', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
    });

    renderWithRouter(<SettingsPage />);
    expect(screen.getByText('Account')).toBeDefined();
  });
});
