import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VerifyEmailPage } from './VerifyEmailPage';
import * as AuthContext from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('VerifyEmailPage', () => {
  const mockVerifyEmail = vi.fn();
  const mockResendVerification = vi.fn();

  const renderWithRouter = (initialEntries: string[] = ['/verify-email']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <VerifyEmailPage />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      verifyEmail: mockVerifyEmail,
      resendVerification: mockResendVerification,
    });
  });

  it('shows error when no token is provided', async () => {
    renderWithRouter(['/verify-email']);

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeDefined();
    });
    expect(screen.getByText(/Missing verification link/)).toBeDefined();
  });

  it('shows loading state while verifying', () => {
    mockVerifyEmail.mockImplementation(() => new Promise(() => {})); // Never resolves
    renderWithRouter(['/verify-email?token=test-token']);

    expect(screen.getByText('Verifying...')).toBeDefined();
  });

  it('shows success state when verification succeeds', async () => {
    mockVerifyEmail.mockResolvedValue({ success: true });
    renderWithRouter(['/verify-email?token=valid-token']);

    await waitFor(() => {
      expect(screen.getByText("You're Verified!")).toBeDefined();
    });
    expect(screen.getByText('Taking you to your recipes...')).toBeDefined();
  });

  it('shows error state when verification fails', async () => {
    mockVerifyEmail.mockResolvedValue({ success: false, error: 'Token expired' });
    renderWithRouter(['/verify-email?token=invalid-token']);

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeDefined();
    });
    expect(screen.getByText('Token expired')).toBeDefined();
  });

  it('shows default error message when no error provided', async () => {
    mockVerifyEmail.mockResolvedValue({ success: false });
    renderWithRouter(['/verify-email?token=invalid-token']);

    await waitFor(() => {
      expect(screen.getByText('This link is invalid or expired.')).toBeDefined();
    });
  });

  it('renders resend form on error', async () => {
    mockVerifyEmail.mockResolvedValue({ success: false });
    renderWithRouter(['/verify-email?token=invalid-token']);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your email')).toBeDefined();
    });
    expect(screen.getByText('Resend')).toBeDefined();
  });

  it('handles resend verification', async () => {
    mockVerifyEmail.mockResolvedValue({ success: false });
    mockResendVerification.mockResolvedValue({ success: true });
    renderWithRouter(['/verify-email?token=invalid-token']);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your email')).toBeDefined();
    });

    const emailInput = screen.getByPlaceholderText('Enter your email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const resendButton = screen.getByText('Resend');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows sent confirmation after resend', async () => {
    mockVerifyEmail.mockResolvedValue({ success: false });
    mockResendVerification.mockResolvedValue({ success: true });
    renderWithRouter(['/verify-email?token=invalid-token']);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your email')).toBeDefined();
    });

    const emailInput = screen.getByPlaceholderText('Enter your email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByText('Resend'));

    await waitFor(() => {
      expect(screen.getByText('Sent!')).toBeDefined();
      expect(screen.getByText('Check your inbox (and spam folder).')).toBeDefined();
    });
  });

  it('disables resend button when email is empty', async () => {
    mockVerifyEmail.mockResolvedValue({ success: false });
    renderWithRouter(['/verify-email?token=invalid-token']);

    await waitFor(() => {
      expect(screen.getByText('Resend')).toBeDefined();
    });

    const resendButton = screen.getByText('Resend');
    expect(resendButton).toHaveProperty('disabled', true);
  });

  it('has back to sign in link', async () => {
    mockVerifyEmail.mockResolvedValue({ success: false });
    renderWithRouter(['/verify-email?token=invalid-token']);

    await waitFor(() => {
      expect(screen.getByText('Back to Sign In')).toBeDefined();
    });
  });

  it('renders dino mascot', () => {
    const { container } = renderWithRouter(['/verify-email']);
    expect(container.querySelector('svg')).toBeDefined();
  });
});
