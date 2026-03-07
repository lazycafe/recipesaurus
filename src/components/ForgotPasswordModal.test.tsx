import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import * as ClientContext from '../client/ClientContext';

vi.mock('../client/ClientContext', () => ({
  useClient: vi.fn(),
}));

describe('ForgotPasswordModal', () => {
  const mockForgotPassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockForgotPassword.mockResolvedValue({ data: { message: 'Email sent' } });
    vi.mocked(ClientContext.useClient).mockReturnValue({
      auth: {
        getSession: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        resendVerification: vi.fn(),
        forgotPassword: mockForgotPassword,
        resetPassword: vi.fn(),
      },
      recipes: {} as any,
      cookbooks: {} as any,
      notifications: {} as any,
      invites: {} as any,
      discover: {} as any,
    });
  });

  it('renders reset password header', () => {
    render(<ForgotPasswordModal onClose={vi.fn()} onBackToLogin={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeDefined();
    expect(screen.getByText('Enter your email to receive a reset link')).toBeDefined();
  });

  it('renders email input field', () => {
    render(<ForgotPasswordModal onClose={vi.fn()} onBackToLogin={vi.fn()} />);
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByPlaceholderText('you@example.com')).toBeDefined();
  });

  it('renders send reset link button', () => {
    render(<ForgotPasswordModal onClose={vi.fn()} onBackToLogin={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeDefined();
  });

  it('calls forgotPassword on form submit', async () => {
    render(<ForgotPasswordModal onClose={vi.fn()} onBackToLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    });

    const form = screen.getByRole('button', { name: 'Send Reset Link' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows success state after successful submission', async () => {
    render(<ForgotPasswordModal onClose={vi.fn()} onBackToLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    });

    const form = screen.getByRole('button', { name: 'Send Reset Link' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Check Your Email' })).toBeDefined();
    });
  });

  it('shows back to sign in button after success', async () => {
    render(<ForgotPasswordModal onClose={vi.fn()} onBackToLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    });

    const form = screen.getByRole('button', { name: 'Send Reset Link' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Back to Sign In' })).toBeDefined();
    });
  });

  it('calls onBackToLogin when back to sign in clicked', async () => {
    const onBackToLogin = vi.fn();
    render(<ForgotPasswordModal onClose={vi.fn()} onBackToLogin={onBackToLogin} />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    });

    const form = screen.getByRole('button', { name: 'Send Reset Link' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Back to Sign In' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to Sign In' }));
    expect(onBackToLogin).toHaveBeenCalledOnce();
  });

  it('shows error on API failure', async () => {
    mockForgotPassword.mockResolvedValue({ error: 'Something went wrong' });
    render(<ForgotPasswordModal onClose={vi.fn()} onBackToLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    });

    const form = screen.getByRole('button', { name: 'Send Reset Link' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeDefined();
    });
  });

  it('closes modal on close button click', () => {
    const onClose = vi.fn();
    render(<ForgotPasswordModal onClose={onClose} onBackToLogin={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has sign in link in footer', () => {
    const onBackToLogin = vi.fn();
    render(<ForgotPasswordModal onClose={vi.fn()} onBackToLogin={onBackToLogin} />);

    expect(screen.getByText('Remember your password?')).toBeDefined();
    fireEvent.click(screen.getByText('Sign in'));
    expect(onBackToLogin).toHaveBeenCalledOnce();
  });
});
