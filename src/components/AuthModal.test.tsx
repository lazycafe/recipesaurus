import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthModal } from './AuthModal';
import * as AuthContext from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('AuthModal', () => {
  const mockLogin = vi.fn();
  const mockRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue({ success: true });
    mockRegister.mockResolvedValue({ success: true });
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      login: mockLogin,
      register: mockRegister,
      logout: vi.fn(),
    });
  });

  it('renders login mode by default', () => {
    render(<AuthModal onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeDefined();
  });

  it('renders register mode when specified', () => {
    render(<AuthModal onClose={vi.fn()} initialMode="register" />);
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeDefined();
  });

  it('shows forgot password link in login mode when handler provided', () => {
    render(<AuthModal onClose={vi.fn()} onForgotPassword={vi.fn()} />);
    expect(screen.getByText('Forgot password?')).toBeDefined();
  });

  it('hides forgot password link when no handler provided', () => {
    render(<AuthModal onClose={vi.fn()} />);
    expect(screen.queryByText('Forgot password?')).toBeNull();
  });

  it('hides forgot password link in register mode', () => {
    render(<AuthModal onClose={vi.fn()} initialMode="register" onForgotPassword={vi.fn()} />);
    expect(screen.queryByText('Forgot password?')).toBeNull();
  });

  it('calls onForgotPassword when forgot password link clicked', () => {
    const onForgotPassword = vi.fn();
    render(<AuthModal onClose={vi.fn()} onForgotPassword={onForgotPassword} />);

    fireEvent.click(screen.getByText('Forgot password?'));
    expect(onForgotPassword).toHaveBeenCalledOnce();
  });

  it('toggles between login and register modes', () => {
    render(<AuthModal onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeDefined();
    fireEvent.click(screen.getByText('Sign up'));
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeDefined();
    fireEvent.click(screen.getByText('Sign in'));
    expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeDefined();
  });

  it('calls login on form submit in login mode', async () => {
    const onClose = vi.fn();
    render(<AuthModal onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your password'), {
      target: { value: 'Password123' },
    });

    const form = screen.getByRole('button', { name: 'Sign In' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Password123');
    });
  });

  it('shows error on login failure', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });
    render(<AuthModal onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your password'), {
      target: { value: 'wrong' },
    });

    const form = screen.getByRole('button', { name: 'Sign In' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeDefined();
    });
  });

  it('closes modal on close button click', () => {
    const onClose = vi.fn();
    render(<AuthModal onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes modal on overlay click', () => {
    const onClose = vi.fn();
    const { container } = render(<AuthModal onClose={onClose} />);

    const overlay = container.querySelector('.modal-overlay')!;
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('toggles password visibility', () => {
    render(<AuthModal onClose={vi.fn()} />);

    const passwordInput = screen.getByPlaceholderText('Your password');
    expect(passwordInput.getAttribute('type')).toBe('password');

    fireEvent.click(screen.getByLabelText('Show password'));
    expect(passwordInput.getAttribute('type')).toBe('text');

    fireEvent.click(screen.getByLabelText('Hide password'));
    expect(passwordInput.getAttribute('type')).toBe('password');
  });
});
