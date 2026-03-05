import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResetPasswordPage } from './ResetPasswordPage';
import * as ClientContext from '../client/ClientContext';

vi.mock('../client/ClientContext', () => ({
  useClient: vi.fn(),
}));

describe('ResetPasswordPage', () => {
  const mockResetPassword = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResetPassword.mockResolvedValue({ data: { message: 'Success' } });
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
    vi.mocked(ClientContext.useClient).mockReturnValue({
      auth: {
        getSession: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: mockResetPassword,
      },
      recipes: {} as any,
      cookbooks: {} as any,
      notifications: {} as any,
      invites: {} as any,
    });
  });

  afterEach(() => {
    // Restore window.location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  const renderWithRouter = (initialEntries: string[] = ['/reset-password?token=valid-token']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <ResetPasswordPage />
      </MemoryRouter>
    );
  };

  it('renders create new password header with valid token', () => {
    renderWithRouter();
    expect(screen.getByRole('heading', { name: 'Create New Password' })).toBeDefined();
    expect(screen.getByText('Enter your new password below')).toBeDefined();
  });

  it('shows error when no token provided', () => {
    renderWithRouter(['/reset-password']);
    expect(screen.getByText('Invalid reset link. Please request a new password reset.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Request New Reset Link' })).toBeDefined();
  });

  it('renders password input fields', () => {
    renderWithRouter();
    expect(screen.getByLabelText('New Password')).toBeDefined();
    expect(screen.getByLabelText('Confirm Password')).toBeDefined();
  });

  it('shows password requirements', () => {
    renderWithRouter();
    expect(screen.getByText('8+ characters with uppercase, lowercase, and number')).toBeDefined();
  });

  it('validates passwords match', async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText('Create a new password'), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your new password'), {
      target: { value: 'Different123' },
    });

    const form = screen.getByRole('button', { name: 'Reset Password' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeDefined();
    });
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('validates password length', async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText('Create a new password'), {
      target: { value: 'Short1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your new password'), {
      target: { value: 'Short1' },
    });

    const form = screen.getByRole('button', { name: 'Reset Password' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeDefined();
    });
  });

  it('validates password has uppercase', async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText('Create a new password'), {
      target: { value: 'lowercase123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your new password'), {
      target: { value: 'lowercase123' },
    });

    const form = screen.getByRole('button', { name: 'Reset Password' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Password must contain at least one uppercase letter')).toBeDefined();
    });
  });

  it('validates password has lowercase', async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText('Create a new password'), {
      target: { value: 'UPPERCASE123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your new password'), {
      target: { value: 'UPPERCASE123' },
    });

    const form = screen.getByRole('button', { name: 'Reset Password' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Password must contain at least one lowercase letter')).toBeDefined();
    });
  });

  it('validates password has number', async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText('Create a new password'), {
      target: { value: 'NoNumbersHere' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your new password'), {
      target: { value: 'NoNumbersHere' },
    });

    const form = screen.getByRole('button', { name: 'Reset Password' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Password must contain at least one number')).toBeDefined();
    });
  });

  it('calls resetPassword with valid password', async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText('Create a new password'), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your new password'), {
      target: { value: 'ValidPass123' },
    });

    const form = screen.getByRole('button', { name: 'Reset Password' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('valid-token', 'ValidPass123');
    });
  });

  it('shows success state after successful reset', async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText('Create a new password'), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your new password'), {
      target: { value: 'ValidPass123' },
    });

    const form = screen.getByRole('button', { name: 'Reset Password' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Password Reset!' })).toBeDefined();
    });
  });

  it('navigates to home on go to sign in click', async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText('Create a new password'), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your new password'), {
      target: { value: 'ValidPass123' },
    });

    const form = screen.getByRole('button', { name: 'Reset Password' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Go to Sign In' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Go to Sign In' }));
    expect(window.location.href).toBe('/');
  });

  it('shows error on API failure', async () => {
    mockResetPassword.mockResolvedValue({ error: 'Invalid or expired reset link.' });
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText('Create a new password'), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm your new password'), {
      target: { value: 'ValidPass123' },
    });

    const form = screen.getByRole('button', { name: 'Reset Password' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Invalid or expired reset link.')).toBeDefined();
    });
  });

  it('toggles password visibility', () => {
    renderWithRouter();

    const passwordInput = screen.getByPlaceholderText('Create a new password');
    expect(passwordInput.getAttribute('type')).toBe('password');

    fireEvent.click(screen.getByLabelText('Show password'));
    expect(passwordInput.getAttribute('type')).toBe('text');

    fireEvent.click(screen.getByLabelText('Hide password'));
    expect(passwordInput.getAttribute('type')).toBe('password');
  });

  it('navigates home when request new link clicked (no token)', () => {
    renderWithRouter(['/reset-password']);

    fireEvent.click(screen.getByRole('button', { name: 'Request New Reset Link' }));
    expect(window.location.href).toBe('/');
  });
});
